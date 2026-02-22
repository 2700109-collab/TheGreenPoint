import {
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.1 — Update Inspection DTO (partial updates)
 */
export class UpdateInspectionDto {
  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'] })
  @IsString()
  @IsIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Reschedule date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  @IsNumber()
  @Min(0.5)
  @IsOptional()
  estimatedDurationHrs?: number;

  @ApiPropertyOptional({ description: 'Additional inspector user IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  additionalInspectors?: string[];

  @ApiPropertyOptional({ description: 'Reason / notes update' })
  @IsString()
  @IsOptional()
  reason?: string;
}
