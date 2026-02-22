import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateExciseRateDto, ExciseLedgerFilterDto } from './dto';
import { Prisma } from '@prisma/client';
import type { ExciseRate, ExciseLedger } from '@prisma/client';

/**
 * Excise summary shape returned by getExciseSummary().
 */
export interface ExciseSummary {
  period: string;
  totalDutyZar: number;
  byCategory: Record<string, { quantity: number; duty: number }>;
  entryCount: number;
}

/** Excise ledger entry with rate info */
interface ExciseLedgerWithRate extends ExciseLedger {
  rate: { productCategory: string; unit: string };
}

/** Shape returned by generateDa260 */
interface Da260Return {
  formType: string;
  reportingPeriod: string;
  generatedAt: string;
  taxpayer: {
    registeredName: string;
    tradingName: string | null;
    registrationNumber: string;
    taxNumber: string | null;
  };
  lineItems: Array<{
    productCategory: string;
    quantityDeclared: number;
    dutyRate: number;
    dutyPayable: number;
  }>;
  totalDutyPayable: number;
  declarationDate: string;
}

/**
 * Section 8.1 — Excise Duty Calculation Engine
 *
 * Automatically calculates excise duty on sale events via the event bus.
 * Manages excise rates and provides period summaries for SARS DA 260 reporting.
 */
@Injectable()
export class ExciseDutyService {
  private readonly logger = new Logger(ExciseDutyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // =========================================================================
  // Event-driven duty calculation
  // =========================================================================

  /**
   * Automatically triggered when a sale is created.
   * Looks up the active excise rate for the batch's product category,
   * calculates duty, and creates an ExciseLedger entry.
   */
  @OnEvent('sale.created')
  async calculateDuty(payload: {
    saleId: string;
    tenantId: string;
    batchId: string;
    quantityGrams: number;
  }): Promise<void> {
    try {
      const batch = await this.prisma.batch.findUnique({
        where: { id: payload.batchId },
        select: { productCategory: true },
      });

      const productCategory = batch?.productCategory || 'dried_flower';

      // Find the active rate for this product category
      const rate = await this.prisma.exciseRate.findFirst({
        where: {
          productCategory,
          isActive: true,
          effectiveDate: { lte: new Date() },
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: new Date() } },
          ],
        },
        orderBy: { effectiveDate: 'desc' },
      });

      if (!rate) {
        this.logger.warn(
          `No active excise rate for category '${productCategory}'. Sale ${payload.saleId} not taxed.`,
        );
        return;
      }

      const quantity = payload.quantityGrams;
      const dutyAmount = quantity * rate.ratePerUnit;
      const reportingPeriod = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

      await this.prisma.exciseLedger.create({
        data: {
          tenantId: payload.tenantId,
          saleId: payload.saleId,
          batchId: payload.batchId,
          rateId: rate.id,
          quantity,
          unit: rate.unit,
          rateApplied: rate.ratePerUnit,
          dutyAmountZar: dutyAmount,
          reportingPeriod,
        },
      });

      this.logger.log(
        `Excise duty R${dutyAmount.toFixed(2)} calculated for sale ${payload.saleId} (${productCategory}, ${quantity}${rate.unit})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to calculate excise duty for sale ${payload.saleId}: ${(err as Error).message}`,
      );
    }
  }

  // =========================================================================
  // Rate management
  // =========================================================================

  /**
   * List all active excise rates.
   */
  async listRates(): Promise<ExciseRate[]> {
    return this.prisma.exciseRate.findMany({
      where: { isActive: true },
      orderBy: [{ productCategory: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

  /**
   * Create a new excise rate. Deactivates any existing active rate
   * for the same product category to prevent overlaps.
   */
  async createRate(
    dto: CreateExciseRateDto,
    userId: string,
    userRole: string,
    tenantId?: string,
  ): Promise<ExciseRate> {
    // Deactivate existing active rates for this category
    await this.prisma.exciseRate.updateMany({
      where: {
        productCategory: dto.productCategory,
        isActive: true,
      },
      data: { isActive: false },
    });

    const rate = await this.prisma.exciseRate.create({
      data: {
        productCategory: dto.productCategory,
        ratePerUnit: dto.ratePerUnit,
        unit: dto.unit,
        effectiveDate: new Date(dto.effectiveDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        isActive: dto.isActive ?? true,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      tenantId,
      entityType: 'excise_rate',
      entityId: rate.id,
      action: 'excise_rate.created',
      metadata: {
        productCategory: dto.productCategory,
        ratePerUnit: dto.ratePerUnit,
        unit: dto.unit,
      },
    });

    this.logger.log(
      `Excise rate created: ${dto.productCategory} @ R${dto.ratePerUnit}/${dto.unit}`,
    );
    return rate;
  }

  // =========================================================================
  // Summaries and reporting
  // =========================================================================

  /**
   * Get excise duty summary for a given reporting period.
   * Aggregates totals by product category.
   */
  async getExciseSummary(tenantId: string | null, period: string): Promise<ExciseSummary> {
    const where: Prisma.ExciseLedgerWhereInput = { reportingPeriod: period };
    if (tenantId) where.tenantId = tenantId;

    const entries = await this.prisma.exciseLedger.findMany({
      where,
      include: { rate: true },
    });

    const byCategory = entries.reduce(
      (acc, e) => {
        const key = e.rate.productCategory;
        if (!acc[key]) acc[key] = { quantity: 0, duty: 0 };
        acc[key]!.quantity += e.quantity;
        acc[key]!.duty += e.dutyAmountZar;
        return acc;
      },
      {} as Record<string, { quantity: number; duty: number }>,
    );

    return {
      period,
      totalDutyZar: entries.reduce((sum, e) => sum + e.dutyAmountZar, 0),
      byCategory,
      entryCount: entries.length,
    };
  }

  /**
   * Get detailed excise ledger entries with pagination and filtering.
   */
  async getLedgerEntries(
    tenantId: string | null,
    filter: ExciseLedgerFilterDto,
  ): Promise<{ data: ExciseLedgerWithRate[]; total: number; page: number; limit: number }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ExciseLedgerWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filter.period) where.reportingPeriod = filter.period;
    if (filter.productCategory) {
      where.rate = { productCategory: filter.productCategory };
    }

    const [data, total] = await Promise.all([
      this.prisma.exciseLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rate: {
            select: { productCategory: true, unit: true },
          },
        },
      }),
      this.prisma.exciseLedger.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Generate SARS DA 260 excise duty return data for a period.
   * Returns structured data ready for XML export.
   */
  async generateDa260(
    tenantId: string,
    period: string,
    userId: string,
    userRole: string,
  ): Promise<Da260Return> {
    const summary = await this.getExciseSummary(tenantId, period);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        tradingName: true,
        registrationNumber: true,
        taxNumber: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const da260 = {
      formType: 'DA 260',
      reportingPeriod: period,
      generatedAt: new Date().toISOString(),
      taxpayer: {
        registeredName: tenant.name,
        tradingName: tenant.tradingName,
        registrationNumber: tenant.registrationNumber,
        taxNumber: tenant.taxNumber,
      },
      lineItems: Object.entries(summary.byCategory).map(
        ([category, data]) => ({
          productCategory: category,
          quantityDeclared: data.quantity,
          dutyRate: data.duty / (data.quantity || 1),
          dutyPayable: data.duty,
        }),
      ),
      totalDutyPayable: summary.totalDutyZar,
      declarationDate: new Date().toISOString().split('T')[0]!,
    };

    // Audit the DA 260 generation
    await this.auditService.log({
      userId,
      userRole,
      tenantId,
      entityType: 'excise_da260',
      entityId: `${tenantId}-${period}`,
      action: 'excise_da260.generated',
      metadata: {
        period,
        totalDutyZar: summary.totalDutyZar,
        entryCount: summary.entryCount,
      },
    });

    this.logger.log(
      `DA 260 generated for tenant ${tenantId}, period ${period}: R${summary.totalDutyZar.toFixed(2)}`,
    );

    return da260;
  }
}
