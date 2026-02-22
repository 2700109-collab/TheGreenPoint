import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Transfer, TransferItem, Batch } from '@prisma/client';
import type { PaginatedResponse } from '@ncts/shared-types';
import type { CreateTransferDto, AcceptTransferDto, RejectTransferDto } from './dto';

/** Transfer with nested items and batch info */
interface TransferWithItems extends Transfer {
  items: Array<TransferItem & { batch: { id: string; batchNumber: string } }>;
}

/** Transfer with tenant and items for regulator view */
interface TransferWithTenantAndItems extends Transfer {
  tenant: { id: string; name: string; tradingName: string | null };
  items: Array<TransferItem & { batch: { id: string; batchNumber: string } }>;
}

/** Detailed transfer with tenant, items, and batch details */
export interface TransferDetail extends Transfer {
  tenant: { id: string; name: string; tradingName: string | null };
  items: Array<TransferItem & { batch: { id: string; batchNumber: string; batchType: string; strainId: string | null } }>;
}

const DISCREPANCY_THRESHOLD = 0.02; // 2%

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTransferDto): Promise<TransferWithItems> {
    // Verify sender facility belongs to tenant
    const senderFacility = await this.prisma.facility.findFirst({
      where: { id: dto.senderFacilityId, tenantId },
    });
    if (!senderFacility) {
      throw new NotFoundException(`Sender facility ${dto.senderFacilityId} not found`);
    }

    // Verify receiver facility exists
    const receiverFacility = await this.prisma.facility.findFirst({
      where: { id: dto.receiverFacilityId, tenantId: dto.receiverTenantId },
    });
    if (!receiverFacility) {
      throw new NotFoundException(`Receiver facility ${dto.receiverFacilityId} not found`);
    }

    // Verify all batches exist and belong to tenant
    for (const item of dto.items) {
      const batch = await this.prisma.batch.findFirst({
        where: { id: item.batchId, tenantId },
      });
      if (!batch) {
        throw new NotFoundException(`Batch ${item.batchId} not found`);
      }
    }

    // Generate transfer number
    const year = new Date().getFullYear();
    const count = await this.prisma.transfer.count();
    const transferNumber = `TRF-${year}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          tenantId,
          transferNumber,
          senderTenantId: tenantId,
          senderFacilityId: dto.senderFacilityId,
          receiverTenantId: dto.receiverTenantId,
          receiverFacilityId: dto.receiverFacilityId,
          status: 'pending',
          initiatedAt: new Date(),
          vehicleRegistration: dto.vehicleRegistration,
          driverName: dto.driverName,
          driverIdNumber: dto.driverIdNumber,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              batchId: item.batchId,
              quantityGrams: item.quantityGrams,
            })),
          },
        },
        include: { items: { include: { batch: { select: { id: true, batchNumber: true } } } } },
      });

      return transfer;
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<TransferWithItems>> {
    const skip = (page - 1) * limit;

    // Show transfers where tenant is sender OR receiver
    const where = {
      OR: [
        { senderTenantId: tenantId },
        { receiverTenantId: tenantId },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        include: {
          items: {
            include: { batch: { select: { id: true, batchNumber: true } } },
          },
        },
        skip,
        take: limit,
        orderBy: { initiatedAt: 'desc' },
      }),
      this.prisma.transfer.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<TransferWithTenantAndItems>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.transfer.findMany({
        include: {
          tenant: { select: { id: true, name: true, tradingName: true } },
          items: {
            include: { batch: { select: { id: true, batchNumber: true } } },
          },
        },
        skip,
        take: limit,
        orderBy: { initiatedAt: 'desc' },
      }),
      this.prisma.transfer.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId?: string): Promise<TransferDetail> {
    const transfer = await this.prisma.transfer.findFirst({
      where: tenantId
        ? { id, OR: [{ senderTenantId: tenantId }, { receiverTenantId: tenantId }] }
        : { id },
      include: {
        tenant: { select: { id: true, name: true, tradingName: true } },
        items: {
          include: {
            batch: {
              select: { id: true, batchNumber: true, batchType: true, strainId: true },
            },
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException(`Transfer ${id} not found`);
    }

    return transfer;
  }

  async accept(id: string, receiverTenantId: string, dto: AcceptTransferDto): Promise<TransferWithItems> {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, receiverTenantId, status: 'pending' },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException(`Pending transfer ${id} not found for your organisation`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Update received quantities
      const discrepancies: { transferItemId: string; batchId: string; sent: number; received: number; pct: number }[] = [];

      for (const receivedItem of dto.receivedItems) {
        await tx.transferItem.update({
          where: { id: receivedItem.transferItemId },
          data: { receivedQuantityGrams: receivedItem.receivedQuantityGrams },
        });

        // Discrepancy detection: compare sent vs received
        const originalItem = transfer.items.find((i) => i.id === receivedItem.transferItemId);
        if (originalItem) {
          const sent = Number(originalItem.quantityGrams);
          const received = receivedItem.receivedQuantityGrams;
          const diff = Math.abs(sent - received);
          const pct = sent > 0 ? diff / sent : 0;

          if (pct > DISCREPANCY_THRESHOLD) {
            discrepancies.push({
              transferItemId: receivedItem.transferItemId,
              batchId: originalItem.batchId,
              sent,
              received,
              pct: Math.round(pct * 10000) / 100, // percentage with 2 decimals
            });
          }
        }
      }

      // If discrepancies found, create ComplianceAlerts
      if (discrepancies.length > 0) {
        // Find or create the transfer discrepancy compliance rule
        let rule = await tx.complianceRule.findFirst({
          where: { category: 'transfer', name: 'Transfer Weight Discrepancy' },
        });

        if (!rule) {
          rule = await tx.complianceRule.create({
            data: {
              name: 'Transfer Weight Discrepancy',
              description: 'Flags transfers where received quantity differs from sent quantity by more than 2%',
              category: 'transfer',
              severity: 'warning',
              evaluationType: 'real_time',
              ruleDefinition: { threshold: DISCREPANCY_THRESHOLD, metric: 'weight_variance' },
            },
          });
        }

        for (const d of discrepancies) {
          await tx.complianceAlert.create({
            data: {
              ruleId: rule.id,
              tenantId: transfer.tenantId,
              severity: d.pct > 10 ? 'critical' : 'warning',
              alertType: 'transfer_discrepancy',
              description: `Transfer ${transfer.transferNumber}: Batch ${d.batchId} sent ${d.sent}g but received ${d.received}g (${d.pct}% variance)`,
              entityType: 'transfer',
              entityId: transfer.id,
              status: 'open',
            },
          });
        }

        this.logger.warn(
          `Transfer ${transfer.transferNumber}: ${discrepancies.length} item(s) with discrepancy >2%`,
        );
      }

      // Mark transfer as accepted
      const updated = await tx.transfer.update({
        where: { id },
        data: {
          status: 'accepted',
          completedAt: new Date(),
          notes: dto.notes ? `${transfer.notes ?? ''}\nAcceptance note: ${dto.notes}` : transfer.notes,
        },
        include: { items: { include: { batch: { select: { id: true, batchNumber: true } } } } },
      });

      return updated;
    });
  }

  async reject(id: string, receiverTenantId: string, dto: RejectTransferDto): Promise<Transfer> {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, receiverTenantId, status: 'pending' },
    });

    if (!transfer) {
      throw new NotFoundException(`Pending transfer ${id} not found for your organisation`);
    }

    return this.prisma.transfer.update({
      where: { id },
      data: {
        status: 'rejected',
        completedAt: new Date(),
        notes: `${transfer.notes ?? ''}\nRejection reason: ${dto.reason}`,
      },
    });
  }
}
