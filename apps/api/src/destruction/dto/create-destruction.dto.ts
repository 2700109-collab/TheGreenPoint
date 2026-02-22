import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsIn,
  IsNumber,
  IsArray,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.2 — Create Destruction Event DTO
 *
 * Requires minimum 2 witnesses (one must be SAPS or SAHPRA).
 */
export class CreateDestructionDto {
  @ApiProperty({ description: 'Facility where destruction occurs' })
  @IsUUID()
  facilityId!: string;

  @ApiProperty({ enum: ['plant', 'batch'], description: 'Type of entities being destroyed' })
  @IsString()
  @IsIn(['plant', 'batch'])
  entityType!: string;

  @ApiProperty({ description: 'IDs of plants or batches to destroy', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  entityIds!: string[];

  @ApiProperty({ description: 'Total weight in kg being destroyed' })
  @IsNumber()
  @Min(0.01)
  quantityKg!: number;

  @ApiProperty({
    enum: ['incineration', 'grinding', 'composting'],
    description: 'Method of destruction',
  })
  @IsString()
  @IsIn(['incineration', 'grinding', 'composting'])
  destructionMethod!: string;

  @ApiProperty({ description: 'Date of destruction (ISO 8601)' })
  @IsDateString()
  destructionDate!: string;

  @ApiProperty({
    description: 'Names of witnesses (minimum 2)',
    type: [String],
    minItems: 2,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  witnessNames!: string[];

  @ApiProperty({
    description: 'Organizations of witnesses (e.g., SAPS, SAHPRA)',
    type: [String],
    minItems: 2,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  witnessOrganizations!: string[];

  @ApiProperty({
    description: 'S3 keys for witness signature images',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  witnessSignatures!: string[];

  @ApiProperty({
    enum: ['failed_lab', 'expired', 'damaged', 'regulatory_order', 'excess'],
  })
  @IsString()
  @IsIn(['failed_lab', 'expired', 'damaged', 'regulatory_order', 'excess'])
  reason!: string;

  @ApiPropertyOptional({ description: 'S3 keys for photos of destruction', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({ description: 'S3 key for video recording' })
  @IsString()
  @IsOptional()
  videoUrl?: string;
}
