import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { ComplianceEngine } from '../compliance/engine/compliance-engine';
import { AlertEscalationService } from '../compliance/escalation/alert-escalation.service';
import { DiversionDetectorService } from '../compliance/diversion/diversion-detector.service';
import { InventoryReconciliationService } from '../compliance/inventory/inventory-reconciliation.service';
import { NotificationService } from '../notifications/notification.service';

/**
 * Section 5.4 — Scheduled Jobs (Cron Tasks)
 *
 * All times are in Africa/Johannesburg (UTC+2) timezone.
 * Note: OutboxPollerService (every 5s) is handled in EventModule.
 * Note: AlertEscalationService (every hour) has its own @Cron in ComplianceModule.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceEngine: ComplianceEngine,
    private readonly alertEscalation: AlertEscalationService,
    private readonly diversionDetector: DiversionDetectorService,
    private readonly inventoryService: InventoryReconciliationService,
    private readonly notifications: NotificationService,
  ) {}

  // ─── Every 5 minutes: Refresh dashboard materialized view ────────

  @Cron('*/5 * * * *')
  async refreshDashboardKpis(): Promise<void> {
    try {
      await this.prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis`;
      this.logger.debug('Dashboard KPIs refreshed');
    } catch (error) {
      // Materialized view may not exist yet — log and continue
      this.logger.warn(`Failed to refresh dashboard KPIs: ${(error as Error).message}`);
    }
  }

  // ─── Every hour: Escalate overdue compliance alerts ──────────────

  @Cron('0 * * * *')
  async hourlyAlertEscalation(): Promise<void> {
    try {
      const escalated = await this.alertEscalation.escalateOverdueAlerts();
      if (escalated > 0) {
        this.logger.log(`Escalated ${escalated} overdue compliance alerts`);
      }
    } catch (error) {
      this.logger.error(`Alert escalation failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  // ─── Daily at 02:00 SAST: Batch compliance rules ────────────────

  @Cron('0 2 * * *', { timeZone: 'Africa/Johannesburg' })
  async dailyComplianceBatch(): Promise<void> {
    this.logger.log('Starting daily compliance batch evaluation');
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const tenant of tenants) {
        try {
          await this.complianceEngine.evaluateBatch(tenant.id);
        } catch (error) {
          this.logger.error(
            `Compliance batch failed for tenant ${tenant.id}: ${(error as Error).message}`,
          );
        }
      }
      this.logger.log(`Daily compliance batch complete for ${tenants.length} tenants`);
    } catch (error) {
      this.logger.error(`Daily compliance batch failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  // ─── Daily at 03:00 SAST: Mass balance check ────────────────────

  @Cron('0 3 * * *', { timeZone: 'Africa/Johannesburg' })
  async dailyMassBalance(): Promise<void> {
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const tenant of tenants) {
        await this.diversionDetector.runMassBalanceCheck(tenant.id);
      }
      this.logger.log(`Daily mass balance check complete for ${tenants.length} tenants`);
    } catch (error) {
      this.logger.error(`Mass balance check failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  // ─── Weekly Monday 04:00 SAST: Verification pattern analysis ────

  @Cron('0 4 * * 1', { timeZone: 'Africa/Johannesburg' })
  async weeklyVerificationAnalysis(): Promise<void> {
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const tenant of tenants) {
        await this.diversionDetector.runVerificationPatternAnalysis(tenant.id);
      }
      this.logger.log(`Weekly verification analysis complete for ${tenants.length} tenants`);
    } catch (error) {
      this.logger.error(`Verification analysis failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  // ─── Monthly 1st at 01:00 SAST: Auto-reconcile inventories ──────

  @Cron('0 1 1 * *', { timeZone: 'Africa/Johannesburg' })
  async monthlyInventoryReconciliation(): Promise<void> {
    try {
      await this.inventoryService.autoReconcileAll();
      this.logger.log('Monthly inventory reconciliation complete');
    } catch (error) {
      this.logger.error(`Inventory reconciliation failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  // ─── Daily at 06:00 SAST: Check permit expirations ──────────────

  @Cron('0 6 * * *', { timeZone: 'Africa/Johannesburg' })
  async dailyPermitExpiryCheck(): Promise<void> {
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Permits expiring within 7 days — critical
      const expiringIn7 = await this.prisma.permit.findMany({
        where: {
          status: 'active',
          expiryDate: { gte: now, lte: in7Days },
        },
        select: { id: true, tenantId: true, permitNumber: true, expiryDate: true },
      });

      for (const permit of expiringIn7) {
        await this.notifications.send({
          tenantId: permit.tenantId,
          role: 'operator_admin',
          type: 'critical',
          title: 'Permit Expiring Soon',
          body: `Permit ${permit.permitNumber} expires on ${permit.expiryDate.toISOString().split('T')[0]}. Immediate renewal required.`,
          channel: 'sms',
          entityType: 'permit',
          entityId: permit.id,
          actionUrl: `/regulatory/permits/${permit.id}`,
        });
      }

      // Permits expiring within 30 days — warning
      const expiringIn30 = await this.prisma.permit.findMany({
        where: {
          status: 'active',
          expiryDate: { gt: in7Days, lte: in30Days },
        },
        select: { id: true, tenantId: true, permitNumber: true, expiryDate: true },
      });

      for (const permit of expiringIn30) {
        await this.notifications.send({
          tenantId: permit.tenantId,
          role: 'operator_admin',
          type: 'warning',
          title: 'Permit Renewal Reminder',
          body: `Permit ${permit.permitNumber} expires on ${permit.expiryDate.toISOString().split('T')[0]}. Plan your renewal.`,
          channel: 'email',
          entityType: 'permit',
          entityId: permit.id,
          actionUrl: `/regulatory/permits/${permit.id}`,
        });
      }

      this.logger.log(
        `Permit expiry check: ${expiringIn7.length} critical, ${expiringIn30.length} warning`,
      );
    } catch (error) {
      this.logger.error(`Permit expiry check failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  // ─── Daily at 00:00 SAST: Clean up old outbox events ────────────

  @Cron('0 0 * * *', { timeZone: 'Africa/Johannesburg' })
  async cleanupOutboxEvents(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.outboxEvent.deleteMany({
        where: {
          publishedAt: { not: null },
          createdAt: { lte: thirtyDaysAgo },
        },
      });
      this.logger.log(`Cleaned up ${result.count} published outbox events`);
    } catch (error) {
      this.logger.error(`Outbox cleanup failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}
