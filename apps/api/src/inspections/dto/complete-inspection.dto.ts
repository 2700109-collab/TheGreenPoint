import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChecklistItemDto {
  @ApiProperty({ description: 'Checklist item text' })
  @IsString()
  item!: string;

  @ApiProperty({ enum: ['pass', 'fail', 'na'] })
  @IsString()
  @IsIn(['pass', 'fail', 'na'])
  status!: string;

  @ApiPropertyOptional({ description: 'Notes for this item' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: string;
}

/**
 * Section 7.1 — Complete Inspection DTO
 */
export class CompleteInspectionDto {
  @ApiPropertyOptional({ description: 'Completed checklist', type: [ChecklistItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  @IsOptional()
  checklist?: ChecklistItemDto[];

  @ApiPropertyOptional({ description: 'Inspector findings / narrative' })
  @IsString()
  @IsOptional()
  findings?: string;

  @ApiProperty({ enum: ['pass', 'conditional_pass', 'fail'] })
  @IsString()
  @IsIn(['pass', 'conditional_pass', 'fail'])
  overallOutcome!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  remediationRequired?: boolean;

  @ApiPropertyOptional({ description: 'Deadline for remediation (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  remediationDeadline?: string;

  @ApiPropertyOptional({ description: 'Notes on remediation actions needed' })
  @IsString()
  @IsOptional()
  remediationNotes?: string;

  @ApiPropertyOptional({ description: 'S3 keys for uploaded photos', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];
}
