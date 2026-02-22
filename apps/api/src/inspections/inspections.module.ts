import { Module } from '@nestjs/common';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { NotificationModule } from '../notifications/notification.module';
import { ReportsModule } from '../reports/reports.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Section 7.1 — Inspections Module
 *
 * Provides inspection scheduling, execution, and completion.
 * Depends on Notifications (operator alerts), Reports (PDF generation),
 * and Audit (compliance trail).
 */
@Module({
  imports: [NotificationModule, ReportsModule, AuditModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
