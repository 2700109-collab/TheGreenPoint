import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

type ExportEntityType = 'plants' | 'batches' | 'transfers' | 'sales' | 'audit_events';

/**
 * Section 6.3 — CSV / XML Export Service
 *
 * Generates CSV data exports and regulatory XML returns
 * (SARS DA 260, INCB Form C) and stores them in S3.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /* ------------------------------------------------------------------
   * Report History
   * ------------------------------------------------------------------ */

  async getReportHistory(
    tenantId: string,
    limit: number,
  ): Promise<Array<Record<string, unknown>>> {
    return this.prisma.auditEvent.findMany({
      where: {
        tenantId,
        action: { contains: 'report' },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        payload: true,
        createdAt: true,
      },
    });
  }

  /* ------------------------------------------------------------------
   * Generic CSV Export
   * ------------------------------------------------------------------ */

  async exportCsv(params: {
    tenantId: string;
    entityType: ExportEntityType;
    filters?: Record<string, unknown>;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<string> {
    const { tenantId, entityType, filters, dateFrom, dateTo } = params;

    const rows = await this.queryData(tenantId, entityType, filters, dateFrom, dateTo);

    if (rows.length === 0) {
      throw new BadRequestException('No data found for the given filters');
    }

    const csv = this.toCsv(rows);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileKey = `${tenantId}/exports/${entityType}-${timestamp}.csv`;

    await this.storageService.uploadBuffer(fileKey, Buffer.from(csv, 'utf-8'), 'text/csv', tenantId);

    this.logger.log(`CSV export generated: ${fileKey} (${rows.length} rows)`);
    return fileKey;
  }

  /* ------------------------------------------------------------------
   * SARS DA 260 XML
   * ------------------------------------------------------------------ */

  async generateDa260Xml(tenantId: string, period: string): Promise<string> {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('Period must be in YYYY-MM format');
    }

    const ledgerEntries = await this.prisma.exciseLedger.findMany({
      where: { tenantId, reportingPeriod: period },
      include: { rate: true },
    });

    if (ledgerEntries.length === 0) {
      throw new BadRequestException(`No excise ledger entries found for period ${period}`);
    }

    const xml = this.buildDa260Xml(ledgerEntries);
    const fileKey = `${tenantId}/reports/da260-${period}.xml`;

    await this.storageService.uploadBuffer(fileKey, Buffer.from(xml, 'utf-8'), 'application/xml', tenantId);

    this.logger.log(`DA 260 XML generated: ${fileKey}`);
    return fileKey;
  }

  /* ------------------------------------------------------------------
   * INCB Form C — Annual Statistical Return
   * ------------------------------------------------------------------ */

  async generateIncbFormC(year: number): Promise<string> {
    if (year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year for INCB Form C');
    }

    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00Z`);

    const [totalProduction, totalExports, totalImports, totalDestruction] =
      await Promise.all([
        this.prisma.harvest.aggregate({
          _sum: { dryWeightGrams: true },
          where: { harvestDate: { gte: startDate, lt: endDate } },
        }),
        this.prisma.importExportRecord.aggregate({
          _sum: { quantityKg: true },
          where: {
            type: 'export',
            createdAt: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.importExportRecord.aggregate({
          _sum: { quantityKg: true },
          where: {
            type: 'import',
            createdAt: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.destructionEvent.aggregate({
          _sum: { quantityKg: true },
          where: {
            destructionDate: { gte: startDate, lt: endDate },
          },
        }),
      ]);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<INCBFormC>
  <Header>
    <Country>ZA</Country>
    <Year>${year}</Year>
    <FormType>FormC</FormType>
    <SubmissionDate>${new Date().toISOString().split('T')[0]}</SubmissionDate>
  </Header>
  <Statistics>
    <Production>
      <SubstanceName>Cannabis</SubstanceName>
      <QuantityKg>${((totalProduction._sum?.dryWeightGrams ?? 0) / 1000).toFixed(3)}</QuantityKg>
    </Production>
    <Exports>
      <SubstanceName>Cannabis</SubstanceName>
      <QuantityKg>${(totalExports._sum.quantityKg ?? 0).toFixed(3)}</QuantityKg>
    </Exports>
    <Imports>
      <SubstanceName>Cannabis</SubstanceName>
      <QuantityKg>${(totalImports._sum.quantityKg ?? 0).toFixed(3)}</QuantityKg>
    </Imports>
    <Destruction>
      <SubstanceName>Cannabis</SubstanceName>
      <QuantityKg>${(totalDestruction._sum.quantityKg ?? 0).toFixed(3)}</QuantityKg>
    </Destruction>
  </Statistics>
</INCBFormC>`;

    const fileKey = `national/reports/incb-form-c-${year}.xml`;
    // System-level report — no tenantId (national aggregate)
    await this.storageService.uploadBuffer(fileKey, Buffer.from(xml, 'utf-8'), 'application/xml');

    this.logger.log(`INCB Form C generated: ${fileKey}`);
    return fileKey;
  }

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */

  private async queryData(
    tenantId: string,
    entityType: ExportEntityType,
    filters?: Record<string, unknown>,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Record<string, unknown>[]> {
    const dateFilter = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
    const hasDateFilter = dateFrom || dateTo;

    switch (entityType) {
      case 'plants':
        return this.prisma.plant.findMany({
          where: {
            tenantId,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            ...(filters?.['status'] ? { status: filters['status'] as string } : {}),
          },
          take: 10_000,
        });

      case 'batches':
        return this.prisma.batch.findMany({
          where: {
            tenantId,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            ...(filters?.['status'] ? { status: filters['status'] as string } : {}),
          },
          take: 10_000,
        });

      case 'transfers':
        return this.prisma.transfer.findMany({
          where: {
            tenantId,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            ...(filters?.['status'] ? { status: filters['status'] as string } : {}),
          },
          include: { items: true },
          take: 10_000,
        });

      case 'sales':
        return this.prisma.sale.findMany({
          where: {
            tenantId,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          take: 10_000,
        });

      case 'audit_events':
        return this.prisma.auditEvent.findMany({
          where: {
            tenantId,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            ...(filters?.['action'] ? { action: filters['action'] as string } : {}),
          },
          take: 10_000,
        });

      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';

    const first = rows[0];
    if (!first) return '';
    const headers = Object.keys(first);
    const csvLines: string[] = [headers.map(h => this.escapeCsvField(h)).join(',')];

    for (const row of rows) {
      const line = headers.map(h => {
        const val = row[h];
        if (val == null) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'object') return this.escapeCsvField(JSON.stringify(val));
        return this.escapeCsvField(String(val));
      });
      csvLines.push(line.join(','));
    }

    return csvLines.join('\n');
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private buildDa260Xml(
    entries: Array<{
      quantity: number;
      unit: string;
      rateApplied: number;
      dutyAmountZar: number;
      rate: {
        productCategory: string;
      };
    }>,
  ): string {
    const totalDuty = entries.reduce((sum, e) => sum + e.dutyAmountZar, 0);

    return `<?xml version="1.0" encoding="UTF-8"?>
<DA260Return>
  <Header>
    <FormVersion>2.0</FormVersion>
    <TaxYear>${new Date().getFullYear()}</TaxYear>
    <ReturnType>Original</ReturnType>
  </Header>
  <CannabisExcise>
${entries
  .map(
    (e) => `    <LineItem>
      <ProductCategory>${this.escapeXml(e.rate.productCategory)}</ProductCategory>
      <Quantity>${e.quantity}</Quantity>
      <Unit>${this.escapeXml(e.unit)}</Unit>
      <DutyRate>${e.rateApplied}</DutyRate>
      <DutyAmount>${e.dutyAmountZar.toFixed(2)}</DutyAmount>
    </LineItem>`,
  )
  .join('\n')}
  </CannabisExcise>
  <Summary>
    <TotalDutyPayable>${totalDuty.toFixed(2)}</TotalDutyPayable>
    <Currency>ZAR</Currency>
  </Summary>
</DA260Return>`;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
