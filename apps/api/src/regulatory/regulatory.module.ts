import { Module } from '@nestjs/common';
import { RegulatoryController } from './regulatory.controller';
import { RegulatoryService } from './regulatory.service';
import { PublicStatisticsController } from './public-statistics.controller';
import { PublicStatisticsService } from './public-statistics.service';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Section 7.4 — Enhanced Regulatory Module
 * Section 8.4 — Public Statistics API (no-auth endpoint)
 *
 * Added RedisModule for KPI/summary caching, AuditModule, DatabaseModule.
 * Added PublicStatisticsController + Service for public aggregate stats.
 */
@Module({
  imports: [DatabaseModule, RedisModule, AuditModule],
  controllers: [RegulatoryController, PublicStatisticsController],
  providers: [RegulatoryService, PublicStatisticsService],
  exports: [RegulatoryService, PublicStatisticsService],
})
export class RegulatoryModule {}
