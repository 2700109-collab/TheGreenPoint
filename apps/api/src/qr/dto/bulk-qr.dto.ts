import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Section 7.6 — Bulk QR Label Generation DTO
 */
export class BulkLabelsDto {
  @ApiProperty({ description: 'Batch IDs to generate labels for', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  batchIds!: string[];
}
