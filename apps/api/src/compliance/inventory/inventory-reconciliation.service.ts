import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Section 3.8 — Inventory Reconciliation Service
 * 
 * Compares operator-declared inventory against tracked chain-of-custody weights.
 * Creates InventorySnapshot records and triggers ComplianceAlerts on variance.
 */
@Injectable()
export class InventoryReconciliationService {
  private readonly logger = new Logger(InventoryReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Manual reconciliation triggered by operator or auto-scheduled monthly.
   */
  async reconcile(
    tenantId: string,
    facilityId: string,
    items: { batchId: string; declaredGrams: number }[],
  ): Promise<ReconciliationReport> {
    const reconciled: ReconciliationItem[] = [];
    let totalExpected = 0;
    let totalDeclared = 0;

    for (const item of items) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: item.batchId },
        select: {
          id: true,
          batchNumber: true,
          processedWeightGrams: true,
          dryWeightGrams: true,
          wetWeightGrams: true,
        },
      });

      if (!batch) continue;

      // Calculate expected weight from chain of custody
      const batchWeight =
        batch.processedWeightGrams ?? batch.dryWeightGrams ?? batch.wetWeightGrams ?? 0;

      // Deduct sold + transferred quantities for this specific batch
      const [soldAgg, transferredAgg] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { batchId: item.batchId },
          _sum: { quantityGrams: true },
        }),
        this.prisma.transferItem.aggregate({
          where: {
            batchId: item.batchId,
            transfer: { status: 'completed' },
          },
          _sum: { quantityGrams: true },
        }),
      ]);

      const expectedGrams =
        batchWeight -
        (soldAgg._sum.quantityGrams || 0) -
        (transferredAgg._sum.quantityGrams || 0);

      const varianceGrams = item.declaredGrams - expectedGrams;
      const variancePercent =
        expectedGrams > 0
          ? (varianceGrams / expectedGrams) * 100
          : 0;

      totalExpected += expectedGrams;
      totalDeclared += item.declaredGrams;

      reconciled.push({
        batchId: item.batchId,
        batchNumber: batch.batchNumber,
        expectedGrams: +expectedGrams.toFixed(1),
        declaredGrams: item.declaredGrams,
        varianceGrams: +varianceGrams.toFixed(1),
        variancePercent: +variancePercent.toFixed(2),
        status: Math.abs(variancePercent) <= 2 ? 'within_tolerance' : 'flagged',
      });
    }

    const totalVariance =
      totalExpected > 0
        ? ((totalDeclared - totalExpected) / totalExpected) * 100
        : 0;

    const snapshotStatus =
      Math.abs(totalVariance) > 5
        ? 'under_investigation'
        : Math.abs(totalVariance) > 2
          ? 'flagged'
          : 'clean';

    // Create inventory snapshot + alert atomically
    const snapshot = await this.prisma.$transaction(async (tx) => {
      const snap = await tx.inventorySnapshot.create({
        data: {
          tenantId,
          facilityId,
          snapshotDate: new Date(),
          snapshotType: 'manual',
          items: reconciled as unknown as import('@prisma/client').Prisma.InputJsonValue,
          totalExpectedGrams: +totalExpected.toFixed(1),
          totalDeclaredGrams: +totalDeclared.toFixed(1),
          variancePercent: +totalVariance.toFixed(2),
          status: snapshotStatus,
        },
      });

      // Create compliance alert if flagged
      if (snapshotStatus !== 'clean') {
        const rule = await tx.complianceRule.findFirst({
          where: { name: 'R003' },
        });

        if (rule) {
          await tx.complianceAlert.create({
            data: {
              ruleId: rule.id,
              tenantId,
              facilityId,
              severity: snapshotStatus === 'under_investigation' ? 'critical' : 'warning',
              alertType: 'R003',
              description: `Inventory variance ${totalVariance.toFixed(2)}% at facility — snapshot ${snap.id}`,
              entityType: 'facility',
              entityId: facilityId,
            },
          });
        }
      }

      return snap;
    });

    return {
      snapshotId: snapshot.id,
      status: snapshotStatus,
      totalExpectedGrams: +totalExpected.toFixed(1),
      totalDeclaredGrams: +totalDeclared.toFixed(1),
      variancePercent: +totalVariance.toFixed(2),
      items: reconciled,
    };
  }

  /**
   * Auto-reconciliation for a facility. Uses last known batch weights
   * as both expected and declared (operator hasn't filed, so we snapshot system state).
   */
  async autoReconcile(tenantId: string, facilityId: string): Promise<void> {
    const batches = await this.prisma.batch.findMany({
      where: { facilityId },
      select: {
        id: true,
        processedWeightGrams: true,
        dryWeightGrams: true,
        wetWeightGrams: true,
      },
    });

    const items = batches.map(b => ({
      batchId: b.id,
      declaredGrams: b.processedWeightGrams ?? b.dryWeightGrams ?? b.wetWeightGrams ?? 0,
    }));

    if (items.length > 0) {
      await this.reconcile(tenantId, facilityId, items);
      this.logger.log(`Auto-reconciled facility ${facilityId} — ${items.length} batches`);
    }
  }

  /**
   * Auto-reconcile all active facilities across all tenants.
   * Used by the monthly scheduler job (1st of month at 01:00 SAST).
   */
  async autoReconcileAll(): Promise<void> {
    const facilities = await this.prisma.facility.findMany({
      where: { isActive: true },
      select: { id: true, tenantId: true },
    });

    for (const facility of facilities) {
      try {
        await this.autoReconcile(facility.tenantId, facility.id);
      } catch (error) {
        this.logger.error(
          `Auto-reconciliation failed for facility ${facility.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`Auto-reconciled ${facilities.length} facilities`);
  }
}

export interface ReconciliationReport {
  snapshotId: string;
  status: string;
  totalExpectedGrams: number;
  totalDeclaredGrams: number;
  variancePercent: number;
  items: ReconciliationItem[];
}

export interface ReconciliationItem {
  batchId: string;
  batchNumber: string;
  expectedGrams: number;
  declaredGrams: number;
  varianceGrams: number;
  variancePercent: number;
  status: string;
}
