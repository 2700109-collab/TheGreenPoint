import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R002 — THC Limit Enforcement (Real-time)
 * Fires on lab result submission. DALRRD hemp threshold: 0.2% THC.
 */
@Injectable()
export class ThcLimitEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R002';
  readonly evaluationType = 'real_time' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    if (!context.entityId) return this.pass();

    const labResult = await this.prisma.labResult.findUnique({
      where: { id: context.entityId },
      include: { batches: { include: { facility: true } } },
    });

    if (!labResult || labResult.batches.length === 0) return this.pass();

    const batch = labResult.batches[0]!;
    // DALRRD hemp threshold: 0.2% THC
    const isHemp = batch.facility.facilityType.includes('hemp');
    const threshold = isHemp ? 0.2 : 100; // No upper THC limit for medicinal cannabis

    const passed = labResult.thcPercent <= threshold;

    return {
      ruleId: 'R002',
      ruleName: 'THC Limit Enforcement',
      passed,
      severity: passed ? 'info' : 'critical',
      description: passed
        ? `THC ${labResult.thcPercent}% within limits`
        : `THC ${labResult.thcPercent}% EXCEEDS ${threshold}% limit for ${isHemp ? 'hemp' : 'medicinal'}`,
      details: {
        thcPercent: labResult.thcPercent,
        threshold,
        batchId: batch.id,
        facilityType: batch.facility.facilityType,
        isHemp,
      },
      autoAction: !passed && isHemp
        ? { type: 'quarantine_batch', params: { batchId: batch.id } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return {
      ruleId: 'R002',
      ruleName: 'THC Limit Enforcement',
      passed: true,
      severity: 'info',
      description: 'No lab result to evaluate',
      details: {},
    };
  }
}
