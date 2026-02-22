import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Section 7.5 — Enhanced Verification Module
 *
 * Added AuditModule dependency for scan logging and suspicious report tracking.
 */
@Module({
  imports: [AuditModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
