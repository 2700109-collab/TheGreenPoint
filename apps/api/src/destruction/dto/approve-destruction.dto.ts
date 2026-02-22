import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.2 — Approve Destruction Event DTO
 */
export class ApproveDestructionDto {
  @ApiPropertyOptional({ description: 'Approver notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
