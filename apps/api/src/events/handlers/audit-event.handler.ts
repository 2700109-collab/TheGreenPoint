import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/audit.service';

/**
 * Audit Event Handler — listens to domain events and creates audit trail entries.
 * Ensures every domain event has a corresponding audit record.
 */
@Injectable()
export class AuditEventHandler {
  private readonly logger = new Logger(AuditEventHandler.name);

  constructor(private readonly auditService: AuditService) {}

  @OnEvent('**')
  async handleAnyEvent(data: { eventType: string; payload: Record<string, unknown> }): Promise<void> {
    try {
      const { eventType, payload } = data;

      // Skip audit-only events to avoid recursion
      if (eventType.startsWith('audit.')) return;

      await this.auditService.log({
        userId: (payload.createdBy as string) || (payload.userId as string) || 'system',
        userRole: (payload.actorRole as string) || 'system',
        tenantId: (payload.tenantId as string) || null,
        entityType: (payload.aggregateType as string) || eventType.split('.')[0] || 'unknown',
        entityId: (payload.aggregateId as string) || (payload.entityId as string) || 'unknown',
        action: eventType,
        metadata: payload,
      });
    } catch (error) {
      // Audit failures from event handler are non-fatal
      this.logger.error(
        `Failed to create audit event for ${data.eventType}: ${(error as Error).message}`,
      );
    }
  }
}
