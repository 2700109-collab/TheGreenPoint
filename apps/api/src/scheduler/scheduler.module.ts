import { Module } from '@nestjs/common';
import { ComplianceModule } from '../compliance/compliance.module';
import { NotificationModule } from '../notifications/notification.module';
import { SchedulerService } from './scheduler.service';

/**
 * Section 5.4 — Scheduler Module
 *
 * Registers all cron-based scheduled jobs.
 * Imports ComplianceModule and NotificationModule for job dependencies.
 *
 * Note: ScheduleModule.forRoot() is already registered in AppModule,
 * so cron decorators are active.
 */
@Module({
  imports: [ComplianceModule, NotificationModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
