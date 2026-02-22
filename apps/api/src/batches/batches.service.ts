import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { PaginatedResponse } from '@ncts/shared-types';
import type { CreateBatchDto, UpdateBatchDto } from './dto';
import type { Batch, Strain, Facility, LabResult, Harvest, Sale, TransferItem, Transfer } from '@prisma/client';

/** Batch list item with strain, facility, lab result, and counts */
interface BatchListItem extends Batch {
  strain: { id: string; name: string; type: string } | null;
  facility: { id: string; name: string };
  labResult: { id: string; status: string; thcPercent: number | null; cbdPercent: number | null } | null;
  _count: { plants: number; transferItems: number; sales: number };
}

/** Batch list item with tenant info for regulator view */
interface BatchRegulatorItem extends BatchListItem {
  tenant: { id: string; name: string; tradingName: string | null };
}

/** Detailed batch with all relations */
interface BatchDetail extends Batch {
  tenant: { id: string; name: string; tradingName: string | null };
  strain: Strain | null;
  facility: { id: string; name: string };
  plants: Array<{ id: string; trackingId: string; state: string; plantedDate: Date }>;
  harvests: Harvest[];
  labResult: LabResult | null;
  transferItems: Array<TransferItem & { transfer: { id: string; transferNumber: string; status: string } }>;
  sales: Sale[];
  parentBatch: { id: string; batchNumber: string } | null;
  childBatches: Array<{ id: string; batchNumber: string; batchType: string }>;
}

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<BatchListItem>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.batch.findMany({
        where: { tenantId },
        include: {
          strain: { select: { id: true, name: true, type: true } },
          facility: { select: { id: true, name: true } },
          labResult: { select: { id: true, status: true, thcPercent: true, cbdPercent: true } },
          _count: { select: { plants: true, transferItems: true, sales: true } },
        },
        skip,
        take: limit,
        orderBy: { createdDate: 'desc' },
      }),
      this.prisma.batch.count({ where: { tenantId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<BatchRegulatorItem>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.batch.findMany({
        include: {
          tenant: { select: { id: true, name: true, tradingName: true } },
          strain: { select: { id: true, name: true, type: true } },
          facility: { select: { id: true, name: true } },
          labResult: { select: { id: true, status: true, thcPercent: true, cbdPercent: true } },
          _count: { select: { plants: true, transferItems: true, sales: true } },
        },
        skip,
        take: limit,
        orderBy: { createdDate: 'desc' },
      }),
      this.prisma.batch.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId?: string): Promise<BatchDetail> {
    const where = tenantId ? { id, tenantId } : { id };
    const batch = await this.prisma.batch.findFirst({
      where,
      include: {
        tenant: { select: { id: true, name: true, tradingName: true } },
        strain: true,
        facility: { select: { id: true, name: true } },
        plants: {
          select: { id: true, trackingId: true, state: true, plantedDate: true },
        },
        harvests: true,
        labResult: true,
        transferItems: {
          include: {
            transfer: {
              select: { id: true, transferNumber: true, status: true },
            },
          },
        },
        sales: true,
        parentBatch: { select: { id: true, batchNumber: true } },
        childBatches: { select: { id: true, batchNumber: true, batchType: true } },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }

    return batch;
  }

  async create(tenantId: string, dto: CreateBatchDto) {
    // Verify parent batch exists and belongs to tenant
    const parentBatch = await this.prisma.batch.findFirst({
      where: { id: dto.parentBatchId, tenantId },
    });
    if (!parentBatch) {
      throw new NotFoundException(`Parent batch ${dto.parentBatchId} not found`);
    }

    // Verify facility belongs to tenant
    const facility = await this.prisma.facility.findFirst({
      where: { id: dto.facilityId, tenantId },
    });
    if (!facility) {
      throw new NotFoundException(`Facility ${dto.facilityId} not found`);
    }

    // Generate batch number
    const year = new Date().getFullYear();
    const prefix = `BATCH-${year}`;
    const lastBatch = await this.prisma.batch.findFirst({
      where: { batchNumber: { startsWith: prefix } },
      orderBy: { batchNumber: 'desc' },
      select: { batchNumber: true },
    });
    let seq = 1;
    if (lastBatch) {
      const parts = lastBatch.batchNumber.split('-');
      seq = parseInt(parts[2] || '0', 10) + 1;
    }
    const batchNumber = `${prefix}-${String(seq).padStart(6, '0')}`;

    return this.prisma.batch.create({
      data: {
        tenantId,
        batchNumber,
        batchType: dto.batchType,
        strainId: parentBatch.strainId,
        facilityId: dto.facilityId,
        plantCount: 0,
        processedWeightGrams: dto.processedWeightGrams,
        parentBatchId: dto.parentBatchId,
        createdDate: new Date(),
      },
      include: {
        strain: { select: { id: true, name: true, type: true } },
        facility: { select: { id: true, name: true } },
        parentBatch: { select: { id: true, batchNumber: true } },
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.batch.findFirst({
      where: { id, tenantId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }

    return this.prisma.batch.update({
      where: { id },
      data: {
        ...(dto.processedWeightGrams !== undefined && { processedWeightGrams: dto.processedWeightGrams }),
        ...(dto.dryWeightGrams !== undefined && { dryWeightGrams: dto.dryWeightGrams }),
      },
      include: {
        strain: { select: { id: true, name: true, type: true } },
        facility: { select: { id: true, name: true } },
        parentBatch: { select: { id: true, batchNumber: true } },
      },
    });
  }
}
