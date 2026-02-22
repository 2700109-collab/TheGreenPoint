import {
  IsUUID,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
  IsDateString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitLabResultDto {
  @ApiProperty()
  @IsUUID()
  batchId!: string;

  @ApiProperty({ example: 'Cape Analytics Lab' })
  @IsString()
  labName!: string;

  @ApiProperty({
    example: 'T0538',
    description: 'SANAS ISO 17025 accreditation number',
  })
  @IsString()
  @Matches(/^T\d{4}$/, { message: 'Must be a valid SANAS accreditation number (e.g., T0538)' })
  labAccreditationNumber!: string;

  @ApiProperty({ example: 'LAB-2026-001' })
  @IsString()
  labReportNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  testDate?: string;

  @ApiProperty({ example: 18.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  thcPercent!: number;

  @ApiProperty({ example: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(100)
  cbdPercent!: number;

  @ApiPropertyOptional({ example: 0.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cbgPercent?: number;

  @ApiPropertyOptional({ example: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cbnPercent?: number;

  @ApiProperty({ example: 5.2 })
  @IsNumber()
  @Min(0)
  moisturePercent!: number;

  @ApiProperty({ example: 19.7, description: 'Total of all cannabinoids' })
  @IsNumber()
  @Min(0)
  @Max(100)
  totalCannabinoidsPercent!: number;

  @ApiProperty()
  @IsBoolean()
  pesticidesPass!: boolean;

  @ApiProperty()
  @IsBoolean()
  heavyMetalsPass!: boolean;

  @ApiProperty()
  @IsBoolean()
  microbialsPass!: boolean;

  @ApiProperty()
  @IsBoolean()
  mycotoxinsPass!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  terpeneProfile?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
