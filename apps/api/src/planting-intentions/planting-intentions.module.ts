import { Module } from '@nestjs/common';
import { PlantingIntentionsService } from './planting-intentions.service';
import { PlantingIntentionsController } from './planting-intentions.controller';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PlantingIntentionsController],
  providers: [PlantingIntentionsService],
  exports: [PlantingIntentionsService],
})
export class PlantingIntentionsModule {}
