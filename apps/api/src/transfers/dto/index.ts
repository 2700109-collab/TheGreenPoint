import {
  IsUUID,
  IsArray,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferItemDto {
  @ApiProperty()
  @IsUUID()
  batchId!: string;

  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Min(0.01)
  quantityGrams!: number;
}

export class CreateTransferDto {
  @ApiProperty()
  @IsUUID()
  senderFacilityId!: string;

  @ApiProperty({ description: 'Tenant ID of the receiving organisation' })
  @IsUUID()
  receiverTenantId!: string;

  @ApiProperty()
  @IsUUID()
  receiverFacilityId!: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  @ArrayMinSize(1)
  items!: TransferItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleRegistration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverIdNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceivedItemDto {
  @ApiProperty()
  @IsUUID()
  transferItemId!: string;

  @ApiProperty({ example: 498.5 })
  @IsNumber()
  @Min(0)
  receivedQuantityGrams!: number;
}

export class AcceptTransferDto {
  @ApiProperty({ description: 'Received items with actual quantities', type: [ReceivedItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  receivedItems!: ReceivedItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectTransferDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}
