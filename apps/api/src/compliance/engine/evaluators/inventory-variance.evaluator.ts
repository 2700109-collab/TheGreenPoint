import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R003 — Inventory Variance Detection (Batch/Scheduled — daily 2 AM)
 * Compares tracked inventory vs declared inventory. Flags >2% variance.
 */
@Injectable()
export class InventoryVarianceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R003';
  readonly evaluationType = 'batch' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const VARIANCE_WARNING = 0.02;  // 2%
    const VARIANCE_CRITICAL = 0.05; // 5%

    const facilities = await this.prisma.facility.findMany({
      where: { tenantId: context.tenantId, isActive: true },
      select: { id: true, name: true },
    });

    const variances: {
      facilityId: string;
      facilityName: string;
      variance: number;
      expected: number;
      actual: number;
    }[] = [];

    for (const facility of facilities) {
      // Total batch weight at this facility
      const batchWeights = await this.prisma.batch.aggregate({
        where: { facilityId: facility.id },
        _sum: { processedWeightGrams: true, dryWeightGrams: true },
      });

      const totalBatchWeight =
        (batchWeights._sum.processedWeightGrams || 0) +
        (batchWeights._sum.dryWeightGrams || 0);

      // Deductions: sold + transferred out + destroyed
      const [sold, transferredOut, destroyed] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { facilityId: facility.id },
          _sum: { quantityGrams: true },
        }),
        this.prisma.transferItem.aggregate({
          where: {
            transfer: {
              senderFacilityId: facility.id,
              status: 'completed',
            },
          },
          _sum: { quantityGrams: true },
        }),
        this.prisma.destructionEvent.aggregate({
          where: { facilityId: facility.id },
          _sum: { quantityKg: true },
        }),
      ]);

      const destroyedGrams = (destroyed._sum.quantityKg || 0) * 1000;
      const expectedInventory =
        totalBatchWeight -
        (sold._sum.quantityGrams || 0) -
        (transferredOut._sum.quantityGrams || 0) -
        destroyedGrams;

      // Latest inventory snapshot
      const latestSnapshot = await this.prisma.inventorySnapshot.findFirst({
        where: { facilityId: facility.id },
        orderBy: { snapshotDate: 'desc' },
      });

      const actualInventory = latestSnapshot?.totalDeclaredGrams || 0;

      if (expectedInventory > 0) {
        const variance = Math.abs(expectedInventory - actualInventory) / expectedInventory;
        if (variance > VARIANCE_WARNING) {
          variances.push({
            facilityId: facility.id,
            facilityName: facility.name,
            variance,
            expected: expectedInventory,
            actual: actualInventory,
          });
        }
      }
    }

    const hasCritical = variances.some(v => v.variance > VARIANCE_CRITICAL);

    return {
      ruleId: 'R003',
      ruleName: 'Inventory Variance Detection',
      passed: variances.length === 0,
      severity: hasCritical ? 'critical' : variances.length > 0 ? 'warning' : 'info',
      description: variances.length === 0
        ? 'All facility inventories within 2% tolerance'
        : `${variances.length} facility(ies) with inventory variance exceeding 2%`,
      details: {
        facilities: variances.map(v => ({
          facilityId: v.facilityId,
          facilityName: v.facilityName,
          variancePercent: (v.variance * 100).toFixed(2),
          expectedGrams: v.expected.toFixed(1),
          actualGrams: v.actual.toFixed(1),
        })),
      },
      suggestedAction: hasCritical
        ? 'Initiate physical inventory audit and investigation'
        : variances.length > 0
          ? 'Schedule inventory reconciliation for flagged facilities'
          : undefined,
      autoAction: hasCritical
        ? {
            type: 'flag_facility_for_audit',
            params: {
              facilityIds: variances
                .filter(v => v.variance > VARIANCE_CRITICAL)
                .map(v => v.facilityId),
            },
          }
        : undefined,
    };
  }
}
