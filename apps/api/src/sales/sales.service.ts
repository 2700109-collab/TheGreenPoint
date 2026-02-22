import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import type { PaginatedResponse } from '@ncts/shared-types';
import type { CreateSaleDto } from './dto';
import type { SalesSummaryQueryDto } from './dto';
import type { Sale } from '@prisma/client';

/** Sale with batch and facility info */
interface SaleWithBatchAndFacility extends Sale {
  batch: { id: string; batchNumber: string };
  facility: { id: string; name: string };
}

/** Sale with tenant, batch, and facility info (regulator view) */
interface SaleWithTenantBatchFacility extends Sale {
  tenant: { id: string; name: string; tradingName: string | null };
  batch: { id: string; batchNumber: string };
  facility: { id: string; name: string };
}

/** Detailed sale with full batch and facility info */
interface SaleDetail extends Sale {
  tenant: { id: string; name: string; tradingName: string | null };
  batch: {
    strain: { id: string; name: string } | null;
    labResult: { id: string; status: string; thcPercent: number | null; cbdPercent: number | null } | null;
  } & Record<string, unknown>;
  facility: { id: string; name: string };
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateSaleDto): Promise<SaleWithBatchAndFacility> {
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

    // --- Inventory deduction: calculate available stock ---
    const totalSold = await this.prisma.sale.aggregate({
      where: { batchId: dto.batchId },
      _sum: { quantityGrams: true },
    });
    const alreadySold = totalSold._sum.quantityGrams ?? 0;
    const batchWeight =
      batch.processedWeightGrams ?? batch.dryWeightGrams ?? batch.wetWeightGrams ?? 0;
    const available = batchWeight - alreadySold;

    if (dto.quantityGrams > available) {
      throw new BadRequestException(
        `Insufficient inventory: ${available.toFixed(2)}g available, ${dto.quantityGrams}g requested`,
      );
    }

    // Generate sale number
    const year = new Date().getFullYear();
    const count = await this.prisma.sale.count();
    const saleNumber = `SALE-${year}-${String(count + 1).padStart(6, '0')}`;

    const sale = await this.prisma.sale.create({
      data: {
        tenantId,
        saleNumber,
        batchId: dto.batchId,
        facilityId: dto.facilityId,
        quantityGrams: dto.quantityGrams,
        priceZar: dto.priceZar,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
        customerVerified: dto.customerVerified ?? false,
      },
      include: {
        batch: { select: { id: true, batchNumber: true } },
        facility: { select: { id: true, name: true } },
      },
    });

    // Emit sale.created event for excise duty auto-calculation (Section 8.1)
    this.eventEmitter.emit('sale.created', {
      saleId: sale.id,
      tenantId,
      batchId: dto.batchId,
      quantityGrams: dto.quantityGrams,
    });

    return sale;
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: { facilityId?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedResponse<SaleWithBatchAndFacility>> {
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = { tenantId };
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

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<SaleWithTenantBatchFacility>> {
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

  async findOne(id: string, tenantId?: string): Promise<SaleDetail> {
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

  async getSummary(tenantId: string | undefined, query: SalesSummaryQueryDto) {
    // Parse period YYYY-MM
    const [year, month] = query.period.split('-').map(Number);
    const startDate = new Date(year!, month! - 1, 1);
    const endDate = new Date(year!, month!, 1); // first day of next month

    const where: Prisma.SaleWhereInput = {
      saleDate: { gte: startDate, lt: endDate },
    };
    if (tenantId) where.tenantId = tenantId;
    if (query.facilityId) where.facilityId = query.facilityId;

    const [aggregates, count, topBatches] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _sum: { quantityGrams: true, priceZar: true },
        _avg: { priceZar: true },
      }),
      this.prisma.sale.count({ where }),
      this.prisma.sale.groupBy({
        by: ['batchId'],
        where,
        _sum: { quantityGrams: true, priceZar: true },
        _count: true,
        orderBy: { _sum: { quantityGrams: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      period: query.period,
      facilityId: query.facilityId ?? null,
      totalSales: count,
      totalQuantityGrams: aggregates._sum.quantityGrams ?? 0,
      totalRevenueZar: aggregates._sum.priceZar ?? 0,
      averagePriceZar: aggregates._avg.priceZar ?? 0,
      topBatches,
    };
  }
}
