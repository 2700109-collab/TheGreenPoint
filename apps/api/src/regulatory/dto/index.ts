import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePermitStatusDto {
  @ApiProperty({ enum: ['active', 'suspended', 'revoked', 'expired', 'pending_review'] })
  @IsEnum(['active', 'suspended', 'revoked', 'expired', 'pending_review'] as const)
  status!: string;

  @ApiPropertyOptional({ description: 'Required when suspending or revoking' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Review notes for audit trail' })
  @IsOptional()
  @IsString()
  notes?: string;
}
