import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R006 — Wet-to-Dry Ratio Anomaly (Real-time)
 * Fires on harvest dry weight update. Normal ratio 3:1 to 5:1 wet:dry.
 * Below 2:1 → added weight; above 7:1 → hiding product.
 */
@Injectable()
export class WetDryRatioEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R006';
  readonly evaluationType = 'real_time' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const MIN_RATIO = 2.0;
    const MAX_RATIO = 7.0;
    const CRITICAL_LOW = 1.5;
    const CRITICAL_HIGH = 9.0;

    if (!context.entityId) return this.pass();

    const harvest = await this.prisma.harvest.findUnique({
      where: { id: context.entityId },
      include: { facility: true },
    });

    if (!harvest || !harvest.wetWeightGrams || !harvest.dryWeightGrams) {
      return this.pass();
    }

    const ratio = harvest.wetWeightGrams / harvest.dryWeightGrams;
    const withinNormal = ratio >= MIN_RATIO && ratio <= MAX_RATIO;
    const isCritical = ratio < CRITICAL_LOW || ratio > CRITICAL_HIGH;

    return {
      ruleId: 'R006',
      ruleName: 'Wet-to-Dry Ratio Anomaly',
      passed: withinNormal,
      severity: isCritical ? 'critical' : !withinNormal ? 'warning' : 'info',
      description: withinNormal
        ? `Wet-to-dry ratio ${ratio.toFixed(2)}:1 within normal range (${MIN_RATIO}:1 – ${MAX_RATIO}:1)`
        : ratio < MIN_RATIO
          ? `Wet-to-dry ratio ${ratio.toFixed(2)}:1 BELOW minimum ${MIN_RATIO}:1 — possible weight manipulation`
          : `Wet-to-dry ratio ${ratio.toFixed(2)}:1 ABOVE maximum ${MAX_RATIO}:1 — possible product diversion`,
      details: {
        harvestId: harvest.id,
        facilityId: harvest.facilityId,
        facilityName: harvest.facility.name,
        wetWeightGrams: harvest.wetWeightGrams,
        dryWeightGrams: harvest.dryWeightGrams,
        ratio: +ratio.toFixed(2),
        normalRange: `${MIN_RATIO}:1 – ${MAX_RATIO}:1`,
      },
      suggestedAction: !withinNormal
        ? 'Schedule facility inspection and verify harvest records'
        : undefined,
      autoAction: isCritical
        ? { type: 'flag_facility_for_audit', params: { facilityId: harvest.facilityId } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return {
      ruleId: 'R006',
      ruleName: 'Wet-to-Dry Ratio Anomaly',
      passed: true,
      severity: 'info',
      description: 'Incomplete harvest data — skipped',
      details: {},
    };
  }
}
