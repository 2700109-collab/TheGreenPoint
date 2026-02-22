import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';

/**
 * Section 3.5 — Alert Escalation Service
 *
 * Escalation workflow:
 *   Level 0: INFO    → In-app notification to facility manager
 *   Level 1: WARNING → Email to operator admin + 48-hour deadline
 *   Level 2: CRITICAL → SMS to regulator + auto-suspend permit + 24-hour deadline
 *   Level 3: EMERGENCY → Flag for ministerial review
 */
@Injectable()
export class AlertEscalationService {
  private readonly logger = new Logger(AlertEscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Process a newly created compliance alert.
   */
  async processNewAlert(alert: {
    id: string;
    tenantId: string;
    severity: string;
    alertType: string;
    description: string;
    facilityId?: string | null;
  }): Promise<void> {
    switch (alert.severity) {
      case 'info':
        await this.notifyFacilityManager(alert);
        break;
      case 'warning':
        await this.notifyOperatorAdmin(alert);
        await this.setResolutionDeadline(alert.id, 48);
        break;
      case 'critical':
        await this.notifyRegulator(alert);
        await this.notifyOperatorAdmin(alert);
        await this.setResolutionDeadline(alert.id, 24);
        break;
    }
  }

  /**
   * Escalate overdue alerts. Called every hour by cron (Section 5).
   */
  async escalateOverdueAlerts(): Promise<number> {
    // Find alerts open/acknowledged for > 48 hours that haven't hit max escalation
    const overdue = await this.prisma.complianceAlert.findMany({
      where: {
        status: { in: ['open', 'acknowledged'] },
        createdAt: { lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        escalationLevel: { lt: 3 },
      },
    });

    for (const alert of overdue) {
      const newLevel = alert.escalationLevel + 1;

      await this.prisma.complianceAlert.update({
        where: { id: alert.id },
        data: { escalationLevel: newLevel, status: 'escalated' },
      });

      await this.processEscalation(alert, newLevel);
      this.logger.warn(`Alert ${alert.id} escalated to level ${newLevel}`);
    }

    return overdue.length;
  }

  private async processEscalation(
    alert: { id: string; tenantId: string; alertType: string; description: string },
    newLevel: number,
  ): Promise<void> {
    if (newLevel >= 2) {
      // Auto-suspend permits for unresolved critical alerts
      const permits = await this.prisma.permit.findMany({
        where: { tenantId: alert.tenantId, status: 'active' },
      });
      for (const permit of permits) {
        await this.prisma.permit.update({
          where: { id: permit.id },
          data: { status: 'suspended' },
        });
      }
      this.logger.warn(`Permits suspended for tenant ${alert.tenantId} due to escalation level ${newLevel}`);
    }

    if (newLevel >= 3) {
      // Flag for ministerial review
      await this.notificationService.sendToRole('super_admin', {
        type: 'critical',
        title: `EMERGENCY: Alert ${alert.id} escalated to Level 3`,
        body: `Unresolved compliance alert requires ministerial review. ${alert.description}`,
      });
    }
  }

  private async setResolutionDeadline(alertId: string, hours: number): Promise<void> {
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);
    await this.prisma.complianceAlert.update({
      where: { id: alertId },
      data: {
        autoActions: {
          resolutionDeadline: deadline.toISOString(),
        },
      },
    });
  }

  private async notifyFacilityManager(alert: {
    id: string;
    tenantId: string;
    alertType: string;
    description: string;
  }): Promise<void> {
    await this.notificationService.sendToRole('operator_admin', {
      tenantId: alert.tenantId,
      type: 'info',
      title: `Compliance Notice: ${alert.alertType}`,
      body: alert.description,
      entityType: 'compliance_alert',
      entityId: alert.id,
    });
  }

  private async notifyOperatorAdmin(alert: {
    id: string;
    tenantId: string;
    alertType: string;
    description: string;
  }): Promise<void> {
    await this.notificationService.sendToRole('operator_admin', {
      tenantId: alert.tenantId,
      type: 'warning',
      title: `Action Required: ${alert.alertType}`,
      body: alert.description,
      channel: 'email',
      entityType: 'compliance_alert',
      entityId: alert.id,
    });
  }

  private async notifyRegulator(alert: {
    id: string;
    tenantId: string;
    alertType: string;
    description: string;
  }): Promise<void> {
    await this.notificationService.sendToRole('regulator', {
      type: 'critical',
      title: `Critical Compliance Violation: ${alert.alertType}`,
      body: `Tenant ${alert.tenantId}: ${alert.description}`,
      channel: 'sms',
      entityType: 'compliance_alert',
      entityId: alert.id,
    });
  }
}
