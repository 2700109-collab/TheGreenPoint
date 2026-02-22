import { Module } from '@nestjs/common';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';
import { NotificationModule } from '../notifications/notification.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Section 7.3 — Import/Export Module
 *
 * Manages international cannabis import/export records
 * with permit validation, INCB quota tracking, and regulatory notifications.
 */
@Module({
  imports: [NotificationModule, AuditModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
  exports: [ImportExportService],
})
export class ImportExportModule {}
