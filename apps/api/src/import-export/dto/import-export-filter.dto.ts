import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.3 — Import/Export filter and pagination DTO
 */
export class ImportExportFilterDto {
  @ApiPropertyOptional({ enum: ['import', 'export'] })
  @IsString()
  @IsIn(['import', 'export'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ enum: ['pending', 'in_transit', 'completed', 'cancelled'] })
  @IsString()
  @IsIn(['pending', 'in_transit', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by country code' })
  @IsString()
  @IsOptional()
  countryCode?: string;

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
