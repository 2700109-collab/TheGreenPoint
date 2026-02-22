import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExportEntityType {
  PLANTS = 'plants',
  BATCHES = 'batches',
  TRANSFERS = 'transfers',
  SALES = 'sales',
  AUDIT_EVENTS = 'audit_events',
}

export class CsvExportDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ enum: ExportEntityType, description: 'Entity type to export' })
  @IsEnum(ExportEntityType)
  entityType!: ExportEntityType;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Additional filters as key-value pairs' })
  @IsOptional()
  filters?: Record<string, unknown>;
}

export class Da260ParamDto {
  @ApiProperty({ description: 'Reporting period in YYYY-MM format', example: '2025-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period!: string;
}

export class Da260BodyDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId!: string;
}

export class IncbFormCParamDto {
  @ApiProperty({ description: 'Year for the INCB Form C report', example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2099)
  year!: number;
}

export class DownloadParamDto {
  @ApiProperty({ description: 'S3 file key to download' })
  @IsString()
  fileKey!: string;
}

export class GenerateReportDto {
  @ApiProperty({ description: 'Report type to generate' })
  @IsEnum(['transfer_manifest', 'inspection_report', 'lab_certificate', 'destruction_certificate'])
  reportType!: string;

  @ApiProperty({ description: 'ID of the source entity' })
  @IsUUID()
  entityId!: string;
}

export class ReportHistoryQueryDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Number of records to return (default 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
