import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditVerifierService } from '../common/services/audit-verifier.service';
import { NotificationModule } from '../notifications/notification.module';

@Global()
@Module({
  imports: [NotificationModule],
  controllers: [AuditController],
  providers: [AuditService, AuditVerifierService],
  exports: [AuditService, AuditVerifierService],
})
export class AuditModule {}
