import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { PopiaService } from './popia.service';
import { PopiaController, PopiaPublicController } from './popia.controller';

/**
 * Section 8.2 — POPIA Compliance Module
 *
 * Provides consent management, subject access requests,
 * data deletion with anonymization, and privacy policy versioning.
 * Privacy policy endpoint is public (no auth required).
 */
@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PopiaController, PopiaPublicController],
  providers: [PopiaService],
  exports: [PopiaService],
})
export class PopiaModule {}
