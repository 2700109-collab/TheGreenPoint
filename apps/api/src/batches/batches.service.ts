import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { PaginatedResponse } from '@ncts/shared-types';

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<any>> {
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

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
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

  async findOne(id: string, tenantId?: string): Promise<any> {
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
}
