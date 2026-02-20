import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
})
export class AppModule {}
