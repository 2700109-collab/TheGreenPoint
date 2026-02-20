import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateSaleDto, PaginatedResponse } from '@ncts/shared-types';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSaleDto): Promise<any> {
    // Verify batch belongs to tenant
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, tenantId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch ${dto.batchId} not found`);
    }

    // Verify facility belongs to tenant
    const facility = await this.prisma.facility.findFirst({
      where: { id: dto.facilityId, tenantId },
    });
    if (!facility) {
      throw new NotFoundException(`Facility ${dto.facilityId} not found`);
    }

    // Generate sale number
    const year = new Date().getFullYear();
    const count = await this.prisma.sale.count();
    const saleNumber = `SALE-${year}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.sale.create({
      data: {
        tenantId,
        saleNumber,
        batchId: dto.batchId,
        facilityId: dto.facilityId,
        quantityGrams: dto.quantityGrams,
        priceZar: dto.priceZar,
        saleDate: new Date(dto.saleDate),
        customerVerified: dto.customerVerified,
      },
      include: {
        batch: { select: { id: true, batchNumber: true } },
        facility: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: { facilityId?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters?.facilityId) where.facilityId = filters.facilityId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.saleDate = {};
      if (filters.dateFrom) where.saleDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.saleDate.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          batch: { select: { id: true, batchNumber: true } },
          facility: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { saleDate: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        include: {
          tenant: { select: { id: true, name: true, tradingName: true } },
          batch: { select: { id: true, batchNumber: true } },
          facility: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { saleDate: 'desc' },
      }),
      this.prisma.sale.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId?: string): Promise<any> {
    const where = tenantId ? { id, tenantId } : { id };
    const sale = await this.prisma.sale.findFirst({
      where,
      include: {
        tenant: { select: { id: true, name: true, tradingName: true } },
        batch: {
          include: {
            strain: { select: { id: true, name: true } },
            labResult: { select: { id: true, status: true, thcPercent: true, cbdPercent: true } },
          },
        },
        facility: { select: { id: true, name: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${id} not found`);
    }

    return sale;
  }
}
