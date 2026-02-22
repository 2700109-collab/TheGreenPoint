import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R008 — Production Limit Check (Real-time)
 * Fires on plant creation. Compare active plants vs permit's maxAnnualQuantityKg.
 * Warn at 90%, block at 100%.
 */
@Injectable()
export class ProductionLimitEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R008';
  readonly evaluationType = 'real_time' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const WARN_THRESHOLD = 0.90;
    const BLOCK_THRESHOLD = 1.00;

    // Get active permits with quantity limits
    const permits = await this.prisma.permit.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'active',
        maxAnnualQuantityKg: { not: null },
      },
      select: { id: true, maxAnnualQuantityKg: true, permitType: true },
    });

    if (permits.length === 0) return this.pass();

    // Count active plants (not harvested or destroyed)
    const activePlantCount = await this.prisma.plant.count({
      where: {
        tenantId: context.tenantId,
        state: { notIn: ['harvested', 'destroyed'] },
      },
    });

    // Use maxAnnualQuantityKg as a proxy for plant count limit
    // (1 plant ≈ avg 100g → kg limit * 10 = approx plant count)
    const maxQuantityKg = Math.min(...permits.map(p => p.maxAnnualQuantityKg!));
    const estimatedMaxPlants = Math.floor(maxQuantityKg * 10);
    const utilization = estimatedMaxPlants > 0 ? activePlantCount / estimatedMaxPlants : 0;

    const atLimit = utilization >= BLOCK_THRESHOLD;
    const nearLimit = utilization >= WARN_THRESHOLD;

    return {
      ruleId: 'R008',
      ruleName: 'Production Limit Check',
      passed: !atLimit,
      severity: atLimit ? 'critical' : nearLimit ? 'warning' : 'info',
      description: atLimit
        ? `BLOCKED: ${activePlantCount}/${estimatedMaxPlants} active plants — at permit limit (100%)`
        : nearLimit
          ? `WARNING: ${activePlantCount}/${estimatedMaxPlants} active plants — ${(utilization * 100).toFixed(0)}% of limit`
          : `${activePlantCount}/${estimatedMaxPlants} active plants — within limits`,
      details: {
        activePlantCount,
        estimatedMaxPlants,
        maxAnnualQuantityKg: maxQuantityKg,
        utilizationPercent: +(utilization * 100).toFixed(1),
        permitIds: permits.map(p => p.id),
      },
      suggestedAction: atLimit
        ? 'Cannot add plants — harvest or destroy existing plants, or apply for permit amendment'
        : nearLimit
          ? 'Approaching production limit — plan harvests accordingly'
          : undefined,
      autoAction: atLimit
        ? { type: 'block_operation', params: { reason: 'production_limit_reached' } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return {
      ruleId: 'R008',
      ruleName: 'Production Limit Check',
      passed: true,
      severity: 'info',
      description: 'No quantity limits on permits',
      details: {},
    };
  }
}
