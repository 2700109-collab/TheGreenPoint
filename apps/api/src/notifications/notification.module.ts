import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

/**
 * Section 5.3 — Notification Module
 *
 * Provides:
 *   - NotificationService (send, getUnread, markRead, etc.)
 *   - NotificationController (5 REST endpoints)
 *
 * Exports NotificationService for use by EventModule handlers.
 */
@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
