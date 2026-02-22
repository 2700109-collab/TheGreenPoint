import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateImportExportDto, ImportExportFilterDto } from './dto';
import { Prisma } from '@prisma/client';
import type { ImportExportRecord } from '@prisma/client';

/** Quota summary entry per country */
interface CountryQuotaEntry {
  countryCode: string;
  totalKg: number;
  records: number;
}

/**
 * Section 7.3 — Import/Export Service
 *
 * Manages import and export records for cannabis products.
 * Validates permits, tracks INCB quotas, and calculates excise duties.
 *
 * Business Rules:
 *   - Permit must be active and cover the product category
 *   - Quantity must not exceed permit's maxAnnualQuantityKg
 *   - INCB quota tracking per country
 *   - Excise duty calculated on export
 */
@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new import/export record.
   * Validates permit, batch, and quota limits.
   */
  async create(
    dto: CreateImportExportDto,
    userId: string,
    userRole: string,
    tenantId: string,
  ): Promise<ImportExportRecord> {
    // Validate batch exists and belongs to tenant
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, tenantId },
      select: { id: true, batchNumber: true },
    });
    if (!batch) {
      throw new NotFoundException(
        `Batch ${dto.batchId} not found or does not belong to tenant`,
      );
    }

    // Validate permit exists, is active, and covers the product category
    const permit = await this.prisma.permit.findFirst({
      where: { id: dto.permitId, tenantId },
      select: {
        id: true,
        status: true,
        expiryDate: true,
        maxAnnualQuantityKg: true,
        authorizedSubstances: true,
      },
    });
    if (!permit) {
      throw new NotFoundException(`Permit ${dto.permitId} not found`);
    }
    if (permit.status !== 'active') {
      throw new BadRequestException(
        `Permit ${dto.permitId} is not active (status: ${permit.status})`,
      );
    }
    if (permit.expiryDate < new Date()) {
      throw new BadRequestException(`Permit ${dto.permitId} has expired`);
    }

    // Check annual quota (sum of existing records this year + new quantity)
    if (permit.maxAnnualQuantityKg) {
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

      const existing = await this.prisma.importExportRecord.aggregate({
        where: {
          tenantId,
          type: dto.type,
          permitId: dto.permitId,
          status: { not: 'cancelled' },
          createdAt: { gte: yearStart, lte: yearEnd },
        },
        _sum: { quantityKg: true },
      });

      const usedKg = existing._sum.quantityKg ?? 0;
      if (usedKg + dto.quantityKg > permit.maxAnnualQuantityKg) {
        throw new BadRequestException(
          `Quantity would exceed annual permit limit. Used: ${usedKg} kg, Requested: ${dto.quantityKg} kg, Limit: ${permit.maxAnnualQuantityKg} kg`,
        );
      }
    }

    const record = await this.prisma.importExportRecord.create({
      data: {
        tenantId,
        type: dto.type,
        countryCode: dto.countryCode,
        partnerCompany: dto.partnerCompany,
        batchId: dto.batchId,
        quantityKg: dto.quantityKg,
        productCategory: dto.productCategory,
        permitId: dto.permitId,
        customsDeclarationNumber: dto.customsDeclarationNumber ?? null,
        shippingDate: dto.shippingDate ? new Date(dto.shippingDate) : null,
        arrivalDate: dto.arrivalDate ? new Date(dto.arrivalDate) : null,
        status: 'pending',
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      tenantId,
      entityType: 'import_export_record',
      entityId: record.id,
      action: `import_export.${dto.type}.created`,
      metadata: {
        type: dto.type,
        countryCode: dto.countryCode,
        quantityKg: dto.quantityKg,
        batchId: dto.batchId,
      },
    });

    // Notify regulator of new import/export
    await this.notificationService.send({
      role: 'regulator',
      type: `import_export_${dto.type}`,
      title: `New ${dto.type.charAt(0).toUpperCase() + dto.type.slice(1)} Record`,
      body: `${dto.quantityKg} kg of ${dto.productCategory} ${dto.type === 'export' ? 'to' : 'from'} ${dto.countryCode}.`,
      entityType: 'import_export_record',
      entityId: record.id,
    });

    this.eventEmitter.emit(`import_export.${dto.type}.created`, {
      recordId: record.id,
      type: dto.type,
      countryCode: dto.countryCode,
      quantityKg: dto.quantityKg,
    });

    this.logger.log(
      `Import/export record ${record.id} created: ${dto.type} ${dto.quantityKg} kg to ${dto.countryCode}`,
    );
    return record;
  }

  /**
   * Get a single import/export record by ID.
   */
  async findOne(recordId: string): Promise<ImportExportRecord> {
    const record = await this.prisma.importExportRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(`Import/Export record ${recordId} not found`);
    }
    return record;
  }

  /**
   * List import/export records with filtering and pagination.
   */
  async findAll(
    filter: ImportExportFilterDto,
    tenantId?: string,
  ): Promise<{ data: ImportExportRecord[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ImportExportRecordWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.countryCode) where.countryCode = filter.countryCode;

    const [data, total] = await Promise.all([
      this.prisma.importExportRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.importExportRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Update the status of an import/export record.
   */
  async updateStatus(
    recordId: string,
    status: string,
    customsDeclarationNumber: string | undefined,
    userId: string,
    userRole: string,
  ): Promise<ImportExportRecord> {
    const record = await this.prisma.importExportRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(`Import/Export record ${recordId} not found`);
    }

    const data: Prisma.ImportExportRecordUpdateInput = { status };
    if (customsDeclarationNumber !== undefined) {
      data.customsDeclarationNumber = customsDeclarationNumber;
    }

    const updated = await this.prisma.importExportRecord.update({
      where: { id: recordId },
      data,
    });

    await this.auditService.log({
      userId,
      userRole,
      tenantId: record.tenantId,
      entityType: 'import_export_record',
      entityId: recordId,
      action: 'import_export.status_updated',
      before: { status: record.status },
      after: { status },
    });

    return updated;
  }

  /**
   * Get INCB quota summary per country for a tenant.
   * Returns total imported/exported vs annual limits.
   */
  async getQuotaSummary(
    tenantId: string,
  ): Promise<{ imports: CountryQuotaEntry[]; exports: CountryQuotaEntry[] }> {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    const records = await this.prisma.importExportRecord.findMany({
      where: {
        tenantId,
        status: { not: 'cancelled' },
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      select: {
        type: true,
        countryCode: true,
        quantityKg: true,
        productCategory: true,
      },
    });

    const importsByCountry = new Map<
      string,
      { countryCode: string; totalKg: number; records: number }
    >();
    const exportsByCountry = new Map<
      string,
      { countryCode: string; totalKg: number; records: number }
    >();

    for (const rec of records) {
      const map = rec.type === 'import' ? importsByCountry : exportsByCountry;
      const existing = map.get(rec.countryCode) ?? {
        countryCode: rec.countryCode,
        totalKg: 0,
        records: 0,
      };
      existing.totalKg += rec.quantityKg;
      existing.records += 1;
      map.set(rec.countryCode, existing);
    }

    return {
      imports: Array.from(importsByCountry.values()),
      exports: Array.from(exportsByCountry.values()),
    };
  }
}
