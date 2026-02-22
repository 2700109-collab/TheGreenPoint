import { IsOptional, IsString, IsIn, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.2 — Destruction event filter / pagination DTO
 */
export class DestructionFilterDto {
  @ApiPropertyOptional({ enum: ['plant', 'batch'] })
  @IsString()
  @IsIn(['plant', 'batch'])
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ enum: ['incineration', 'grinding', 'composting'] })
  @IsString()
  @IsIn(['incineration', 'grinding', 'composting'])
  @IsOptional()
  destructionMethod?: string;

  @ApiPropertyOptional({ description: 'Filter by facility' })
  @IsString()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
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
