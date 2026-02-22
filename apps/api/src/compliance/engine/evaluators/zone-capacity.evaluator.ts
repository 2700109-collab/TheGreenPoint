import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R010 — Zone Capacity Check (Real-time)
 * Fires on plant creation/move. Blocks if zone is at capacity.
 */
@Injectable()
export class ZoneCapacityEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R010';
  readonly evaluationType = 'real_time' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const zoneId = context.metadata?.zoneId as string | undefined;
    if (!zoneId) return this.pass();

    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      include: { facility: true },
    });

    if (!zone || !zone.capacity) return this.pass();

    const currentCount = await this.prisma.plant.count({
      where: {
        zoneId: zone.id,
        state: { notIn: ['harvested', 'destroyed'] },
      },
    });

    const utilization = currentCount / zone.capacity;
    const atCapacity = currentCount >= zone.capacity;
    const nearCapacity = utilization >= 0.9;

    return {
      ruleId: 'R010',
      ruleName: 'Zone Capacity Check',
      passed: !atCapacity,
      severity: atCapacity ? 'critical' : nearCapacity ? 'warning' : 'info',
      description: atCapacity
        ? `BLOCKED: Zone "${zone.name}" at capacity (${currentCount}/${zone.capacity} plants)`
        : nearCapacity
          ? `Zone "${zone.name}" nearly full (${currentCount}/${zone.capacity} — ${(utilization * 100).toFixed(0)}%)`
          : `Zone "${zone.name}" has space (${currentCount}/${zone.capacity})`,
      details: {
        zoneId: zone.id,
        zoneName: zone.name,
        facilityName: zone.facility.name,
        currentCount,
        capacity: zone.capacity,
        utilizationPercent: +(utilization * 100).toFixed(1),
      },
      suggestedAction: atCapacity
        ? 'Move plants to a different zone or harvest existing plants'
        : undefined,
      autoAction: atCapacity
        ? { type: 'block_operation', params: { reason: 'zone_capacity_reached', zoneId } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return {
      ruleId: 'R010',
      ruleName: 'Zone Capacity Check',
      passed: true,
      severity: 'info',
      description: 'No zone capacity constraint',
      details: {},
    };
  }
}
