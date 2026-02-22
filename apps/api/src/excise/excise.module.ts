import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { ExciseDutyService } from './excise.service';
import { ExciseController } from './excise.controller';

/**
 * Section 8.1 — Excise Duty Module
 *
 * Provides excise rate management, automatic duty calculation
 * on sale events, and SARS DA 260 reporting.
 */
@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [ExciseController],
  providers: [ExciseDutyService],
  exports: [ExciseDutyService],
})
export class ExciseModule {}
