import {
  IsUUID,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto';

export class CreateHarvestDto {
  @ApiProperty({ description: 'Plant IDs to harvest (must be in FLOWERING state)' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  plantIds!: string[];

  @ApiProperty()
  @IsUUID()
  facilityId!: string;

  @ApiProperty({ example: 2500.5 })
  @IsNumber()
  @Min(0.01)
  wetWeightGrams!: number;

  @ApiPropertyOptional({ example: 625.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dryWeightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestDate?: string;
}

export class UpdateHarvestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dryWeightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class HarvestFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestedAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestedBefore?: string;
}
