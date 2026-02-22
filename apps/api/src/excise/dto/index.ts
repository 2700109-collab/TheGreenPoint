import { IsString, IsNumber, IsOptional, IsDateString, IsIn, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 8.1 — Create or update an excise rate.
 */
export class CreateExciseRateDto {
  @ApiProperty({
    enum: ['dried_flower', 'extract', 'edible', 'hemp_fiber'],
    description: 'Product category for the excise rate',
  })
  @IsString()
  @IsIn(['dried_flower', 'extract', 'edible', 'hemp_fiber'])
  productCategory!: string;

  @ApiProperty({ description: 'Rate per unit in ZAR' })
  @IsNumber()
  @Min(0)
  ratePerUnit!: number;

  @ApiProperty({ enum: ['gram', 'ml', 'unit'], description: 'Unit of measurement' })
  @IsString()
  @IsIn(['gram', 'ml', 'unit'])
  unit!: string;

  @ApiProperty({ description: 'Effective date (ISO 8601)' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional({ description: 'Expiry date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Whether the rate is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Section 8.1 — Excise ledger filter DTO.
 */
export class ExciseLedgerFilterDto {
  @ApiPropertyOptional({ description: 'Reporting period (YYYY-MM)' })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiPropertyOptional({ description: 'Product category filter' })
  @IsString()
  @IsOptional()
  productCategory?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
