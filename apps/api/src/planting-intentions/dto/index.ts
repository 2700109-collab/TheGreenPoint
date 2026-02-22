import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Cultivar breakdown for a planting intention.
 */
export class CultivarBreakdownDto {
  @ApiProperty({ description: 'Strain ID' })
  @IsUUID()
  strainId!: string;

  @ApiProperty({ description: 'Area in hectares' })
  @IsNumber()
  @Min(0.01)
  areaHectares!: number;

  @ApiProperty({ description: 'Estimated yield in kilograms' })
  @IsNumber()
  @Min(0)
  estimatedYieldKg!: number;
}

/**
 * Section 8.3 — Create planting intention DTO.
 */
export class CreatePlantingIntentionDto {
  @ApiProperty({ description: 'Facility ID where planting will occur' })
  @IsUUID()
  facilityId!: string;

  @ApiProperty({ description: 'Season identifier (e.g. 2026/2027)' })
  @IsString()
  season!: string;

  @ApiProperty({ description: 'Cultivar breakdown', type: [CultivarBreakdownDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CultivarBreakdownDto)
  cultivars!: CultivarBreakdownDto[];

  @ApiProperty({ description: 'Total area in hectares' })
  @IsNumber()
  @Min(0.01)
  totalAreaHa!: number;

  @ApiProperty({ description: 'Total estimated yield in kilograms' })
  @IsNumber()
  @Min(0)
  totalEstYieldKg!: number;

  @ApiProperty({ description: 'Planting start date (ISO 8601)' })
  @IsDateString()
  plantingStart!: string;

  @ApiProperty({ description: 'Planting end date (ISO 8601)' })
  @IsDateString()
  plantingEnd!: string;
}

/**
 * Section 8.3 — Update planting intention DTO.
 * Only draft intentions can be updated.
 */
export class UpdatePlantingIntentionDto {
  @ApiPropertyOptional({ description: 'Season identifier' })
  @IsString()
  @IsOptional()
  season?: string;

  @ApiPropertyOptional({ description: 'Cultivar breakdown', type: [CultivarBreakdownDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CultivarBreakdownDto)
  @IsOptional()
  cultivars?: CultivarBreakdownDto[];

  @ApiPropertyOptional({ description: 'Total area in hectares' })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  totalAreaHa?: number;

  @ApiPropertyOptional({ description: 'Total estimated yield in kilograms' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalEstYieldKg?: number;

  @ApiPropertyOptional({ description: 'Planting start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  plantingStart?: string;

  @ApiPropertyOptional({ description: 'Planting end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  plantingEnd?: string;
}

/**
 * Section 8.3 — Planting intention list filter DTO.
 */
export class PlantingIntentionFilterDto {
  @ApiPropertyOptional({ description: 'Filter by season' })
  @IsString()
  @IsOptional()
  season?: string;

  @ApiPropertyOptional({ enum: ['draft', 'submitted', 'acknowledged'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by facility' })
  @IsUUID()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
