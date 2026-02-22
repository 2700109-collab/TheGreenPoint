import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.3 — Update Import/Export record status DTO
 */
export class UpdateImportExportStatusDto {
  @ApiProperty({ enum: ['pending', 'in_transit', 'completed', 'cancelled'] })
  @IsString()
  @IsIn(['pending', 'in_transit', 'completed', 'cancelled'])
  status!: string;

  @ApiPropertyOptional({ description: 'Customs declaration number' })
  @IsString()
  @IsOptional()
  customsDeclarationNumber?: string;
}
