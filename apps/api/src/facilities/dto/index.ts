import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeoJsonPolygonDto {
  @ApiProperty({ example: 'Polygon' })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsArray()
  coordinates!: number[][][];

  [key: string]: unknown;
}

export class CreateFacilityDto {
  @ApiProperty({ example: 'Cape Town Cultivation Facility' })
  @IsString()
  name!: string;

  @ApiProperty({
    enum: ['cultivation', 'processing', 'distribution', 'retail', 'research', 'hemp_industrial'],
  })
  @IsEnum(['cultivation', 'processing', 'distribution', 'retail', 'research', 'hemp_industrial'] as const)
  facilityType!: string;

  @ApiPropertyOptional({
    example: 'MUN-CPT-2026-001',
    description: 'Municipal business license number (required for retail & distribution)',
  })
  @IsOptional()
  @IsString()
  municipalLicenseNumber?: string;

  @ApiProperty({ example: 'Western Cape' })
  @IsString()
  province!: string;

  @ApiProperty({ example: '123 Main Street, Cape Town, 8001' })
  @IsString()
  address!: string;

  @ApiProperty({ example: -33.9249 })
  @IsNumber()
  @Min(-35)
  @Max(-22)
  latitude!: number;

  @ApiProperty({ example: 18.4241 })
  @IsNumber()
  @Min(16)
  @Max(33)
  longitude!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  boundary?: GeoJsonPolygonDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFacilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-35)
  @Max(-22)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(16)
  @Max(33)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  boundary?: GeoJsonPolygonDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateZoneDto {
  @ApiProperty({ example: 'Zone A - Flowering' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'flowering' })
  @IsString()
  zoneType!: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  capacity!: number;
}
