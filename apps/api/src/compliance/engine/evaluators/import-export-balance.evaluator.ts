import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R013 — Import/Export Balance (Batch — monthly, 1st at 5 AM)
 * Cross-reference import/export records with INCB quotas.
 */
@Injectable()
export class ImportExportBalanceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R013';
  readonly evaluationType = 'batch' as const;

  // INCB annual quotas (would be configurable in production)
  private readonly QUOTAS: Record<string, number> = {
    cannabis_export_total_kg: 5000,
    cannabis_import_total_kg: 500,
  };

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const QUOTA_WARNING = 0.80;
    const currentYear = new Date().getFullYear();

    const records = await this.prisma.importExportRecord.findMany({
      where: {
        tenantId: context.tenantId,
        createdAt: { gte: new Date(`${currentYear}-01-01`) },
      },
      select: { type: true, countryCode: true, quantityKg: true },
    });

    const exportTotalKg = records
      .filter(r => r.type === 'export')
      .reduce((sum, r) => sum + r.quantityKg, 0);

    const importTotalKg = records
      .filter(r => r.type === 'import')
      .reduce((sum, r) => sum + r.quantityKg, 0);

    const issues: {
      type: string;
      currentKg: number;
      quotaKg: number;
      utilization: number;
    }[] = [];

    const exportQuota = this.QUOTAS.cannabis_export_total_kg ?? 5000;
    if (exportTotalKg / exportQuota > QUOTA_WARNING) {
      issues.push({
        type: 'export',
        currentKg: exportTotalKg,
        quotaKg: exportQuota,
        utilization: exportTotalKg / exportQuota,
      });
    }

    const importQuota = this.QUOTAS.cannabis_import_total_kg ?? 500;
    if (importTotalKg / importQuota > QUOTA_WARNING) {
      issues.push({
        type: 'import',
        currentKg: importTotalKg,
        quotaKg: importQuota,
        utilization: importTotalKg / importQuota,
      });
    }

    return {
      ruleId: 'R013',
      ruleName: 'Import/Export Balance',
      passed: issues.length === 0,
      severity: issues.some(i => i.utilization > 0.95)
        ? 'critical'
        : issues.length > 0
          ? 'warning'
          : 'info',
      description: issues.length === 0
        ? `Import/export within INCB quotas (export: ${exportTotalKg.toFixed(0)}kg, import: ${importTotalKg.toFixed(0)}kg)`
        : `${issues.length} quota(s) approaching limits`,
      details: {
        exportTotalKg: +exportTotalKg.toFixed(1),
        importTotalKg: +importTotalKg.toFixed(1),
        year: currentYear,
        issues: issues.map(i => ({
          type: i.type,
          currentKg: +i.currentKg.toFixed(1),
          quotaKg: i.quotaKg,
          utilizationPercent: +(i.utilization * 100).toFixed(1),
        })),
      },
      suggestedAction: issues.length > 0
        ? 'Review import/export projections and coordinate with INCB for quota adjustment if needed'
        : undefined,
    };
  }
}
