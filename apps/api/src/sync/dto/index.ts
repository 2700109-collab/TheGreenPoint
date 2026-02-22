import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A single changed record in WatermelonDB push format.
 */
export class SyncChangeRecordDto {
  @ApiProperty({ description: 'Record ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Record data (key-value)' })
  record!: Record<string, unknown>;
}

/**
 * Changes for a single table in WatermelonDB format.
 */
export class SyncTableChangesDto {
  @ApiProperty({ description: 'Created records', type: [SyncChangeRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncChangeRecordDto)
  created!: SyncChangeRecordDto[];

  @ApiProperty({ description: 'Updated records', type: [SyncChangeRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncChangeRecordDto)
  updated!: SyncChangeRecordDto[];

  @ApiProperty({ description: 'Deleted record IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  deleted!: string[];
}

/**
 * Section 7.7 — Push sync DTO (client → server).
 * WatermelonDB format: { changes: { tableName: { created, updated, deleted } }, lastPulledAt }
 */
export class SyncPushDto {
  @ApiProperty({ description: 'Changes keyed by table name' })
  @ValidateNested()
  @Type(() => SyncTableChangesDto)
  changes!: Record<string, SyncTableChangesDto>;

  @ApiPropertyOptional({ description: 'Last pull timestamp from client' })
  @IsDateString()
  @IsOptional()
  lastPulledAt?: string;
}

/**
 * Section 7.7 — Pull sync query parameters.
 */
export class SyncPullQueryDto {
  @ApiPropertyOptional({ description: 'Last sync timestamp (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  lastPulledAt?: string;

  @ApiPropertyOptional({
    description: 'Specific tables to sync',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tables?: string[];
}
