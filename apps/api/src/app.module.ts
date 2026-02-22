import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
import { EncryptionModule } from './common/encryption/encryption.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { PlantsModule } from './plants/plants.module';
import { BatchesModule } from './batches/batches.module';
import { HarvestsModule } from './harvests/harvests.module';
import { LabResultsModule } from './lab-results/lab-results.module';
import { TransfersModule } from './transfers/transfers.module';
import { SalesModule } from './sales/sales.module';
import { RegulatoryModule } from './regulatory/regulatory.module';
import { VerificationModule } from './verification/verification.module';
import { ComplianceModule } from './compliance/compliance.module';
import { EventModule } from './events/event.module';
import { NotificationModule } from './notifications/notification.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StorageModule } from './storage/storage.module';
import { ReportsModule } from './reports/reports.module';
// Section 7 — Government Integration APIs
import { InspectionsModule } from './inspections/inspections.module';
import { DestructionModule } from './destruction/destruction.module';
import { ImportExportModule } from './import-export/import-export.module';
import { QrModule } from './qr/qr.module';
import { SyncModule } from './sync/sync.module';
// Section 8 — Advanced Features
import { ExciseModule } from './excise/excise.module';
import { PopiaModule } from './popia/popia.module';
import { PlantingIntentionsModule } from './planting-intentions/planting-intentions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'public',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'authenticated',
        ttl: 60000,
        limit: 1000,
      },
      {
        name: 'login',
        ttl: 60000,
        limit: 5,
      },
    ]),
    RedisModule,
    DatabaseModule,
    AuditModule,
    EncryptionModule, // Section 9.3 — global field-level encryption
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
    ComplianceModule,
    EventModule,
    NotificationModule,
    SchedulerModule,
    StorageModule,
    ReportsModule,
    // Section 7 — Government Integration APIs
    InspectionsModule,
    DestructionModule,
    ImportExportModule,
    QrModule,
    SyncModule,
    // Section 8 — Advanced Features
    ExciseModule,
    PopiaModule,
    PlantingIntentionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Section 9.1 — XSS sanitization on all incoming request bodies
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeInterceptor,
    },
  ],
})
export class AppModule {}
