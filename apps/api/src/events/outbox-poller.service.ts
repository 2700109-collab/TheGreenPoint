import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { EventBusService } from './event-bus.service';

/**
 * Section 5.1 — Outbox Poller Service
 *
 * Polls the `outbox_events` table every 5 seconds for unpublished events,
 * dispatches them through the EventBusService, and marks them as published.
 *
 * This implements the Transactional Outbox pattern:
 *   1. Domain services write events in the same DB transaction as the domain op
 *   2. This poller reliably publishes them (at-least-once delivery)
 *   3. Failed events remain unpublished and are retried on the next poll
 */
@Injectable()
export class OutboxPollerService {
  private readonly logger = new Logger(OutboxPollerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  @Cron('*/5 * * * * *') // Every 5 seconds
  async pollAndPublish(): Promise<void> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    if (events.length === 0) return;

    let published = 0;
    for (const event of events) {
      try {
        await this.eventBus.emit(
          event.eventType,
          event.payload as Record<string, unknown>,
        );
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
        published++;
      } catch (error) {
        this.logger.error(
          `Failed to publish event ${event.id} (${event.eventType}): ${(error as Error).message}`,
        );
        // Event stays unpublished → will be retried next poll cycle
      }
    }

    if (published > 0) {
      this.logger.debug(`Published ${published}/${events.length} outbox events`);
    }
  }
}
