import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.3 — Create Import/Export Record DTO
 */
export class CreateImportExportDto {
  @ApiProperty({ enum: ['import', 'export'] })
  @IsString()
  @IsIn(['import', 'export'])
  type!: string;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code', example: 'DE' })
  @IsString()
  countryCode!: string;

  @ApiProperty({ description: 'Partner company name' })
  @IsString()
  partnerCompany!: string;

  @ApiProperty({ description: 'Batch being imported/exported' })
  @IsUUID()
  batchId!: string;

  @ApiProperty({ description: 'Quantity in kg' })
  @IsNumber()
  @Min(0.001)
  quantityKg!: number;

  @ApiProperty({
    description: 'Product category',
    enum: ['dried_flower', 'extract', 'edible', 'hemp_fiber'],
  })
  @IsString()
  @IsIn(['dried_flower', 'extract', 'edible', 'hemp_fiber'])
  productCategory!: string;

  @ApiProperty({ description: 'Related SAHPRA permit ID' })
  @IsUUID()
  permitId!: string;

  @ApiPropertyOptional({ description: 'Customs declaration number' })
  @IsString()
  @IsOptional()
  customsDeclarationNumber?: string;

  @ApiPropertyOptional({ description: 'Shipping date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  shippingDate?: string;

  @ApiPropertyOptional({ description: 'Expected arrival date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  arrivalDate?: string;
}
