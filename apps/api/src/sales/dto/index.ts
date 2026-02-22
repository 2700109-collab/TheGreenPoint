import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto';

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  batchId!: string;

  @ApiProperty()
  @IsUUID()
  facilityId!: string;

  @ApiProperty({ example: 10.0 })
  @IsNumber()
  @Min(0.01)
  quantityGrams!: number;

  @ApiProperty({ example: 1500.0, description: 'Total price in ZAR' })
  @IsNumber()
  @Min(0)
  priceZar!: number;

  @ApiPropertyOptional({ enum: ['retail', 'wholesale', 'medical', 'export'] })
  @IsOptional()
  @IsEnum(['retail', 'wholesale', 'medical', 'export'] as const)
  saleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  saleDate?: string;

  @ApiPropertyOptional({ description: 'Whether customer ID was verified' })
  @IsOptional()
  @IsBoolean()
  customerVerified?: boolean;
}

export class SaleFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class SalesSummaryQueryDto {
  @ApiProperty({ example: '2026-03', description: 'Period in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be YYYY-MM format' })
  period!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  @Type(() => String)
  facilityId?: string;
}
