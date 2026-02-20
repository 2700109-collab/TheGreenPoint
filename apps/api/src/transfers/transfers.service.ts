import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateTransferDto, AcceptTransferDto, RejectTransferDto, PaginatedResponse } from '@ncts/shared-types';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTransferDto): Promise<any> {
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
  ): Promise<PaginatedResponse<any>> {
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

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
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

  async findOne(id: string, tenantId?: string): Promise<any> {
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

  async accept(id: string, receiverTenantId: string, dto: AcceptTransferDto): Promise<any> {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, receiverTenantId, status: 'pending' },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException(`Pending transfer ${id} not found for your organisation`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Update received quantities
      for (const item of dto.items) {
        await tx.transferItem.update({
          where: { id: item.transferItemId },
          data: { receivedQuantityGrams: item.receivedQuantityGrams },
        });
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

  async reject(id: string, receiverTenantId: string, dto: RejectTransferDto): Promise<any> {
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
