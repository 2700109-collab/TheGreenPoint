import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R007 — Mass Balance Check (Batch — daily 3 AM)
 * For each facility: harvested_weight − batch_weight − waste < 2% tolerance.
 * Persistent imbalance over 3+ days triggers escalation.
 */
@Injectable()
export class MassBalanceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R007';
  readonly evaluationType = 'batch' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const TOLERANCE = 0.02;
    const CRITICAL_TOLERANCE = 0.05;
    const PERSISTENT_DAYS = 3;

    const facilities = await this.prisma.facility.findMany({
      where: { tenantId: context.tenantId, isActive: true },
      select: { id: true, name: true },
    });

    const imbalances: {
      facilityId: string;
      facilityName: string;
      imbalancePercent: number;
      persistent: boolean;
    }[] = [];

    for (const facility of facilities) {
      const harvestTotal = await this.prisma.harvest.aggregate({
        where: { facilityId: facility.id },
        _sum: { dryWeightGrams: true },
      });

      const [batchTotal, wasteTotal] = await Promise.all([
        this.prisma.batch.aggregate({
          where: { facilityId: facility.id },
          _sum: { processedWeightGrams: true },
        }),
        this.prisma.destructionEvent.aggregate({
          where: { facilityId: facility.id },
          _sum: { quantityKg: true },
        }),
      ]);

      const input = harvestTotal._sum.dryWeightGrams || 0;
      const output =
        (batchTotal._sum.processedWeightGrams || 0) +
        (wasteTotal._sum.quantityKg || 0) * 1000; // kg→g

      if (input > 0) {
        const imbalance = Math.abs(input - output) / input;
        if (imbalance > TOLERANCE) {
          // Check persistence: already flagged in recent days?
          const recentAlerts = await this.prisma.complianceAlert.count({
            where: {
              alertType: 'R007',
              entityId: facility.id,
              createdAt: { gte: new Date(Date.now() - PERSISTENT_DAYS * 24 * 60 * 60 * 1000) },
            },
          });

          imbalances.push({
            facilityId: facility.id,
            facilityName: facility.name,
            imbalancePercent: imbalance * 100,
            persistent: recentAlerts >= PERSISTENT_DAYS - 1,
          });
        }
      }
    }

    const hasCritical = imbalances.some(
      i => i.imbalancePercent > CRITICAL_TOLERANCE * 100 || i.persistent,
    );

    return {
      ruleId: 'R007',
      ruleName: 'Mass Balance Check',
      passed: imbalances.length === 0,
      severity: hasCritical ? 'critical' : imbalances.length > 0 ? 'warning' : 'info',
      description: imbalances.length === 0
        ? 'All facilities within mass balance tolerance'
        : `${imbalances.length} facility(ies) with mass balance imbalance`,
      details: {
        facilities: imbalances.map(i => ({
          facilityId: i.facilityId,
          facilityName: i.facilityName,
          imbalancePercent: +i.imbalancePercent.toFixed(2),
          persistent: i.persistent,
        })),
      },
      suggestedAction: hasCritical
        ? 'Initiate investigation — persistent mass imbalance indicates potential diversion'
        : imbalances.length > 0
          ? 'Schedule physical inventory verification'
          : undefined,
      autoAction: imbalances.some(i => i.persistent)
        ? {
            type: 'lock_facility',
            params: { facilityId: imbalances.find(i => i.persistent)!.facilityId },
          }
        : undefined,
    };
  }
}
