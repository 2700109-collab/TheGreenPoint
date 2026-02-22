import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Section 7.7 — Mobile Sync Module
 *
 * WatermelonDB-compatible sync API for offline-first mobile clients.
 * Supports pull, push, and reference data endpoints.
 */
@Module({
  imports: [AuditModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
