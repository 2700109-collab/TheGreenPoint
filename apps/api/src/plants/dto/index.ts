import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SortableQueryDto } from '../../common/dto';

export class CreatePlantDto {
  @ApiProperty()
  @IsUUID()
  strainId!: string;

  @ApiProperty()
  @IsUUID()
  facilityId!: string;

  @ApiProperty()
  @IsUUID()
  zoneId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  motherPlantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantedDate?: string;
}

export class BatchCreatePlantsDto {
  @ApiProperty({ type: [CreatePlantDto], minItems: 1, maxItems: 1000 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlantDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  plants!: CreatePlantDto[];
}

export class UpdatePlantStateDto {
  @ApiProperty({ enum: ['seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'] })
  @IsEnum(['seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'] as const)
  state!: string;

  @ApiPropertyOptional({ description: 'Required when destroying a plant' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  destroyedDate?: string;
}

export class PlantFilterDto extends SortableQueryDto {
  @ApiPropertyOptional({ enum: ['seed', 'seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'] })
  @IsOptional()
  @IsEnum(['seed', 'seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'] as const)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  strainId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantedAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantedBefore?: string;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'] as const)
  sortOrder?: string;
}
