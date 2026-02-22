import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Section 5.2 — Event Bus Service
 *
 * Thin wrapper around NestJS EventEmitter2.  Provides a single `emit()` method
 * used exclusively by the OutboxPollerService to dispatch domain events after
 * they have been persisted in the outbox table.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a domain event asynchronously.
   * All registered `@OnEvent` handlers for `eventType` will be invoked.
   */
  async emit(eventType: string, payload: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Emitting event: ${eventType}`);
    await this.eventEmitter.emitAsync(eventType, { eventType, payload });
  }
}
