import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBatchDto {
  @ApiProperty({ description: 'Parent batch ID (from harvest or upstream batch)' })
  @IsUUID()
  parentBatchId!: string;

  @ApiProperty({ enum: ['processed', 'packaged', 'extracted'] })
  @IsEnum(['processed', 'packaged', 'extracted'] as const)
  batchType!: string;

  @ApiProperty()
  @IsUUID()
  facilityId!: string;

  @ApiProperty({ example: 450.0 })
  @IsNumber()
  @Min(0.01)
  processedWeightGrams!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBatchDto {
  @ApiPropertyOptional({ example: 430.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processedWeightGrams?: number;

  @ApiPropertyOptional({ example: 550.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dryWeightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
