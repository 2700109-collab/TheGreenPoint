import { IsOptional, IsString, IsIn, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.1 — Inspection list filter / pagination DTO
 */
export class InspectionFilterDto {
  @ApiPropertyOptional({ enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'] })
  @IsString()
  @IsIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['routine', 'complaint', 'follow_up', 'random'] })
  @IsString()
  @IsIn(['routine', 'complaint', 'follow_up', 'random'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by facility' })
  @IsString()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by inspector ID' })
  @IsString()
  @IsOptional()
  inspectorId?: string;

  @ApiPropertyOptional({ description: 'Start date for scheduled range (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'End date for scheduled range (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
