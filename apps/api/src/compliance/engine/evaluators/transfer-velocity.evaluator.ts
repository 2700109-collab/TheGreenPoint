import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R004 — Transfer Velocity Anomaly (Real-time)
 * Fires on transfer creation. Flags if tenant's transfer rate >3σ above mean.
 */
@Injectable()
export class TransferVelocityEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R004';
  readonly evaluationType = 'real_time' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const LOOKBACK_DAYS = 30;
    const SIGMA_THRESHOLD = 3;
    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const allTenantCounts = await this.prisma.transfer.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: lookbackDate } },
      _count: true,
    });

    if (allTenantCounts.length < 3) {
      return this.pass('Insufficient data for statistical analysis');
    }

    const counts = allTenantCounts.map(t => t._count);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdDev = Math.sqrt(
      counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length,
    );

    const currentTenantCount =
      allTenantCounts.find(t => t.tenantId === context.tenantId)?._count || 0;
    const zScore = stdDev > 0 ? (currentTenantCount - mean) / stdDev : 0;

    const passed = zScore <= SIGMA_THRESHOLD;

    return {
      ruleId: 'R004',
      ruleName: 'Transfer Velocity Anomaly',
      passed,
      severity: passed ? 'info' : zScore > 5 ? 'critical' : 'warning',
      description: passed
        ? `Transfer rate normal (z-score: ${zScore.toFixed(2)})`
        : `Transfer rate anomaly: ${currentTenantCount} transfers in ${LOOKBACK_DAYS}d (z-score: ${zScore.toFixed(2)}, threshold: ${SIGMA_THRESHOLD}σ)`,
      details: {
        tenantTransferCount: currentTenantCount,
        meanTransferCount: +mean.toFixed(1),
        stdDev: +stdDev.toFixed(1),
        zScore: +zScore.toFixed(2),
        lookbackDays: LOOKBACK_DAYS,
      },
      suggestedAction: !passed
        ? 'Investigate unusual transfer volume — potential diversion'
        : undefined,
      autoAction:
        zScore > 5
          ? { type: 'flag_transfer', params: { transferId: context.entityId } }
          : undefined,
    };
  }

  private pass(description: string): RuleEvaluationResult {
    return {
      ruleId: 'R004',
      ruleName: 'Transfer Velocity Anomaly',
      passed: true,
      severity: 'info',
      description,
      details: {},
    };
  }
}
