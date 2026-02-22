import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsIn,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.1 — Schedule / Create Inspection DTO
 */
export class CreateInspectionDto {
  @ApiProperty({ description: 'Facility to inspect' })
  @IsUUID()
  facilityId!: string;

  @ApiProperty({ enum: ['routine', 'complaint', 'follow_up', 'random'] })
  @IsString()
  @IsIn(['routine', 'complaint', 'follow_up', 'random'])
  type!: string;

  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @ApiProperty({ description: 'When to conduct the inspection (ISO 8601)' })
  @IsDateString()
  scheduledDate!: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  @IsNumber()
  @Min(0.5)
  @IsOptional()
  estimatedDurationHrs?: number;

  @ApiPropertyOptional({ description: 'Reason for the inspection' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional inspector user IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  additionalInspectors?: string[];

  @ApiPropertyOptional({ description: 'Follow-up from a previous inspection' })
  @IsUUID()
  @IsOptional()
  followUpInspectionId?: string;
}
