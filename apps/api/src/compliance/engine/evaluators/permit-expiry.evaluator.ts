import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R001 — Permit Expiry Check (Scheduled)
 * Flags permits expiring within 30 days. Critical if within 7 days.
 */
@Injectable()
export class PermitExpiryEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R001';
  readonly evaluationType = 'scheduled' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const expiringSoon = await this.prisma.permit.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'active',
        expiryDate: { lte: thirtyDaysFromNow },
      },
      select: { id: true, permitNumber: true, expiryDate: true, permitType: true },
    });

    const hasCritical = expiringSoon.some(p => p.expiryDate < sevenDaysFromNow);

    return {
      ruleId: 'R001',
      ruleName: 'Permit Expiry Check',
      passed: expiringSoon.length === 0,
      severity: hasCritical ? 'critical' : expiringSoon.length > 0 ? 'warning' : 'info',
      description: expiringSoon.length === 0
        ? 'All permits valid — no expiry within 30 days'
        : `${expiringSoon.length} permit(s) expiring within 30 days`,
      details: {
        permits: expiringSoon.map(p => ({
          id: p.id,
          permitNumber: p.permitNumber,
          permitType: p.permitType,
          expiryDate: p.expiryDate.toISOString(),
          daysRemaining: Math.ceil((p.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
        })),
      },
      suggestedAction: expiringSoon.length > 0 ? 'Initiate permit renewal process' : undefined,
    };
  }
}
