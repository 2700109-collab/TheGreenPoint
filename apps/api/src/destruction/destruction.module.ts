import { Module } from '@nestjs/common';
import { DestructionController } from './destruction.controller';
import { DestructionService } from './destruction.service';
import { NotificationModule } from '../notifications/notification.module';
import { ReportsModule } from '../reports/reports.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Section 7.2 — Destruction & Disposal Module
 *
 * Manages cannabis destruction events with witness attestation,
 * regulatory notification, and certificate generation.
 */
@Module({
  imports: [NotificationModule, ReportsModule, AuditModule],
  controllers: [DestructionController],
  providers: [DestructionService],
  exports: [DestructionService],
})
export class DestructionModule {}
