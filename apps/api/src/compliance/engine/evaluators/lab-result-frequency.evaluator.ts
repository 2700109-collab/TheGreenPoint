import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R009 — Lab Result Frequency (Batch — weekly Monday 4 AM)
 * Flags batches older than 30 days without lab results. Auto-hold sales of untested batches.
 */
@Injectable()
export class LabResultFrequencyEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R009';
  readonly evaluationType = 'batch' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const MAX_DAYS_WITHOUT_TEST = 30;
    const cutoff = new Date(Date.now() - MAX_DAYS_WITHOUT_TEST * 24 * 60 * 60 * 1000);

    // Find batches older than 30 days with no lab results
    const untestedBatches = await this.prisma.batch.findMany({
      where: {
        tenantId: context.tenantId,
        createdAt: { lte: cutoff },
        labResultId: null,
      },
      select: {
        id: true,
        batchNumber: true,
        createdAt: true,
        facility: { select: { name: true } },
      },
    });

    // Check if any untested batches have been sold
    const batchIdsWithSales = await this.prisma.sale.findMany({
      where: { batchId: { in: untestedBatches.map(b => b.id) } },
      select: { batchId: true },
      distinct: ['batchId'],
    });

    const batchesWithUntestedSales = new Set(batchIdsWithSales.map(s => s.batchId));

    return {
      ruleId: 'R009',
      ruleName: 'Lab Result Frequency',
      passed: untestedBatches.length === 0,
      severity: batchesWithUntestedSales.size > 0
        ? 'critical'
        : untestedBatches.length > 0
          ? 'warning'
          : 'info',
      description: untestedBatches.length === 0
        ? 'All batches have lab results within 30-day window'
        : `${untestedBatches.length} batch(es) overdue for lab testing (>${MAX_DAYS_WITHOUT_TEST} days). ${batchesWithUntestedSales.size} have active sales.`,
      details: {
        untestedBatches: untestedBatches.map(b => ({
          batchId: b.id,
          batchNumber: b.batchNumber,
          facility: b.facility.name,
          daysSinceCreation: Math.floor(
            (Date.now() - b.createdAt.getTime()) / (24 * 60 * 60 * 1000),
          ),
          hasSales: batchesWithUntestedSales.has(b.id),
        })),
      },
      suggestedAction: untestedBatches.length > 0
        ? 'Submit lab samples immediately for overdue batches. Suspend sales of untested batches.'
        : undefined,
      autoAction: batchesWithUntestedSales.size > 0
        ? { type: 'hold_batch_sales', params: { batchIds: [...batchesWithUntestedSales] } }
        : undefined,
    };
  }
}
