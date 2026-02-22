import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { verifyChain } from '@ncts/audit-lib';

/**
 * Background job that periodically verifies the integrity of the audit event hash chain.
 * Runs every 6 hours and checks the most recent 1000 events.
 * 
 * Alerts on any hash mismatch indicating potential tampering.
 */
@Injectable()
export class AuditVerifierService {
  private readonly logger = new Logger(AuditVerifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async verifyRecentAuditChain() {
    this.logger.log('Starting periodic audit chain verification...');

    try {
      const events = await this.prisma.auditEvent.findMany({
        orderBy: { sequenceNumber: 'asc' },
        take: 1000,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          actorId: true,
          payload: true,
          previousHash: true,
          eventHash: true,
          createdAt: true,
        },
      });

      if (events.length === 0) {
        this.logger.log('No audit events to verify');
        return;
      }

      const chainEvents = events.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        action: e.action,
        actorId: e.actorId,
        payload: e.payload as Record<string, unknown>,
        previousHash: e.previousHash,
        eventHash: e.eventHash,
        createdAt: e.createdAt.toISOString(),
      }));

      const result = verifyChain(chainEvents);

      if (result.valid) {
        this.logger.log(
          `Audit chain verified: ${result.checkedCount} events — all intact`,
        );
      } else {
        // CRITICAL ALERT — potential tampering detected
        this.logger.error(
          `AUDIT CHAIN BROKEN at event index ${result.brokenAt}! ` +
          `Expected hash: ${result.expectedHash}, ` +
          `Actual hash: ${result.actualHash}. ` +
          `Checked ${result.checkedCount} events.`,
        );

        // Dispatch tamper alert to all regulators and super_admins
        const alertNotification = {
          type: 'critical',
          title: 'CRITICAL: Audit Chain Tampering Detected',
          body:
            `Audit chain integrity verification FAILED at event index ${result.brokenAt}. ` +
            `Expected hash: ${result.expectedHash}, Actual hash: ${result.actualHash}. ` +
            `${result.checkedCount} events were checked. Immediate investigation required.`,
          channel: 'email' as const,
          entityType: 'audit_event',
        };

        await Promise.all([
          this.notificationService.sendToRole('regulator', alertNotification),
          this.notificationService.sendToRole('super_admin', alertNotification),
        ]);
      }
    } catch (error) {
      this.logger.error(
        `Audit verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Manual verification endpoint for on-demand chain checking.
   */
  async verifyFullChain(): Promise<{
    valid: boolean;
    totalEvents: number;
    brokenAt?: number;
  }> {
    const count = await this.prisma.auditEvent.count();
    const batchSize = 5000;
    let offset = 0;
    let totalChecked = 0;

    while (offset < count) {
      const events = await this.prisma.auditEvent.findMany({
        orderBy: { sequenceNumber: 'asc' },
        skip: offset,
        take: batchSize,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          actorId: true,
          payload: true,
          previousHash: true,
          eventHash: true,
          createdAt: true,
        },
      });

      const chainEvents = events.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        action: e.action,
        actorId: e.actorId,
        payload: e.payload as Record<string, unknown>,
        previousHash: e.previousHash,
        eventHash: e.eventHash,
        createdAt: e.createdAt.toISOString(),
      }));

      const result = verifyChain(chainEvents);
      totalChecked += result.checkedCount;

      if (!result.valid) {
        return {
          valid: false,
          totalEvents: count,
          brokenAt: offset + (result.brokenAt || 0),
        };
      }

      offset += batchSize;
    }

    return { valid: true, totalEvents: count };
  }
}
