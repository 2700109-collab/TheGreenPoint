import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { OutboxPollerService } from './outbox-poller.service';
import {
  AuditEventHandler,
  ComplianceEventHandler,
  NotificationEventHandler,
} from './handlers';
import { ComplianceModule } from '../compliance/compliance.module';
import { NotificationModule } from '../notifications/notification.module';

/**
 * Section 5.1 / 5.2 — Event System Module
 *
 * Sets up the NestJS EventEmitter with wildcard support, registers
 * the outbox poller, and all domain event handlers.
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    forwardRef(() => ComplianceModule),
    forwardRef(() => NotificationModule),
  ],
  providers: [
    EventBusService,
    OutboxPollerService,
    // Event handlers
    AuditEventHandler,
    ComplianceEventHandler,
    NotificationEventHandler,
  ],
  exports: [EventBusService],
})
export class EventModule {}
