import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditVerifierService } from './common/services/audit-verifier.service';
import { HealthModule } from './health/health.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { PlantsModule } from './plants/plants.module';
import { BatchesModule } from './batches/batches.module';
import { HarvestsModule } from './harvests/harvests.module';
import { LabResultsModule } from './lab-results/lab-results.module';
import { TransfersModule } from './transfers/transfers.module';
import { SalesModule } from './sales/sales.module';
import { RegulatoryModule } from './regulatory/regulatory.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    HealthModule,
    FacilitiesModule,
    PlantsModule,
    BatchesModule,
    HarvestsModule,
    LabResultsModule,
    TransfersModule,
    SalesModule,
    RegulatoryModule,
    VerificationModule,
  ],
  providers: [
    // Global audit interceptor — logs all state-changing API calls
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Background hash-chain verifier — runs every 6 hours
    AuditVerifierService,
  ],
})
export class AppModule {}
