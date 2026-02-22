import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Rules ─────────────────────────────────────────────────────────────────

export class CreateRuleDto {
  @ApiProperty({ example: 'R015' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Custom compliance rule description' })
  @IsString()
  description!: string;

  @ApiProperty({ enum: ['permit', 'inventory', 'lab', 'production', 'transfer', 'verification'] })
  @IsEnum(['permit', 'inventory', 'lab', 'production', 'transfer', 'verification'] as const)
  category!: string;

  @ApiProperty({ enum: ['info', 'warning', 'critical'] })
  @IsEnum(['info', 'warning', 'critical'] as const)
  severity!: string;

  @ApiProperty({ enum: ['real_time', 'batch', 'scheduled'] })
  @IsEnum(['real_time', 'batch', 'scheduled'] as const)
  evaluationType!: string;

  @ApiProperty()
  @IsObject()
  ruleDefinition!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  thresholds?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  escalationPolicy?: Record<string, unknown>;
}

export class UpdateRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  thresholds?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  escalationPolicy?: Record<string, unknown>;
}

// ─── Alerts ────────────────────────────────────────────────────────────────

export class AlertFilterDto {
  @ApiPropertyOptional({ enum: ['info', 'warning', 'critical'] })
  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'] as const)
  severity?: string;

  @ApiPropertyOptional({ enum: ['open', 'acknowledged', 'investigating', 'resolved', 'escalated'] })
  @IsOptional()
  @IsEnum(['open', 'acknowledged', 'investigating', 'resolved', 'escalated'] as const)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class UpdateAlertDto {
  @ApiProperty({ enum: ['acknowledged', 'investigating', 'resolved'] })
  @IsEnum(['acknowledged', 'investigating', 'resolved'] as const)
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}

// ─── Inventory Reconciliation ──────────────────────────────────────────────

export class ReconciliationItemDto {
  @ApiProperty()
  @IsUUID()
  batchId!: string;

  @ApiProperty({ example: 498.5 })
  @IsNumber()
  @Min(0)
  declaredGrams!: number;
}

export class InventorySnapshotDto {
  @ApiProperty()
  @IsUUID()
  facilityId!: string;

  @ApiProperty({ type: [ReconciliationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  @ArrayMinSize(1)
  items!: ReconciliationItemDto[];
}
