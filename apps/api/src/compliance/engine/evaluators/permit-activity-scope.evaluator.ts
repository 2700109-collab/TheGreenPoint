import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R014 — Permit Activity Scope (Real-time)
 * Verifies the operation being performed is within the permit's authorizedActivities.
 */
@Injectable()
export class PermitActivityScopeEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R014';
  readonly evaluationType = 'real_time' as const;

  // Map API operations to required permit activities
  private readonly OPERATION_ACTIVITY_MAP: Record<string, string> = {
    'plant.create': 'cultivation',
    'plant.update': 'cultivation',
    'harvest.create': 'cultivation',
    'batch.create': 'processing',
    'batch.process': 'processing',
    'sale.create': 'distribution',
    'transfer.create': 'distribution',
    'import.create': 'import',
    'export.create': 'export',
    'research.activity': 'research',
  };

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const operation = context.metadata?.operation as string | undefined;
    if (!operation) return this.pass();

    const requiredActivity = this.OPERATION_ACTIVITY_MAP[operation];
    if (!requiredActivity) return this.pass();

    const permits = await this.prisma.permit.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'active',
        expiryDate: { gte: new Date() },
      },
      select: { id: true, authorizedActivities: true, permitType: true },
    });

    if (permits.length === 0) {
      return {
        ruleId: 'R014',
        ruleName: 'Permit Activity Scope',
        passed: false,
        severity: 'critical',
        description: 'No active permits found — all operations blocked',
        details: { operation, requiredActivity },
        autoAction: { type: 'block_operation', params: { reason: 'no_active_permit' } },
      };
    }

    const authorized = permits.some(p =>
      (p.authorizedActivities as string[])?.includes(requiredActivity),
    );

    return {
      ruleId: 'R014',
      ruleName: 'Permit Activity Scope',
      passed: authorized,
      severity: authorized ? 'info' : 'critical',
      description: authorized
        ? `Operation "${operation}" authorized under activity "${requiredActivity}"`
        : `BLOCKED: Operation "${operation}" requires "${requiredActivity}" — not in any active permit`,
      details: {
        operation,
        requiredActivity,
        permitActivities: permits.flatMap(p => (p.authorizedActivities as string[]) || []),
        permitCount: permits.length,
      },
      suggestedAction: !authorized
        ? `Apply for permit amendment to include "${requiredActivity}" authorization`
        : undefined,
      autoAction: !authorized
        ? { type: 'block_operation', params: { reason: 'unauthorized_activity', requiredActivity } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return {
      ruleId: 'R014',
      ruleName: 'Permit Activity Scope',
      passed: true,
      severity: 'info',
      description: 'No scope check required',
      details: {},
    };
  }
}
