import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for requesting a presigned upload URL.
 */
export class PresignedUploadDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({
    description: 'Entity type the file belongs to',
    enum: [
      'inspections',
      'destruction-events',
      'lab-results',
      'transfers',
      'reports',
    ],
  })
  @IsEnum([
    'inspections',
    'destruction-events',
    'lab-results',
    'transfers',
    'reports',
  ])
  entityType!: string;

  @ApiProperty({ description: 'Entity ID (UUID)' })
  @IsUUID()
  entityId!: string;

  @ApiProperty({ description: 'Original filename', example: 'photo-001.jpg' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({
    description: 'MIME content type',
    example: 'image/jpeg',
  })
  @IsString()
  @Matches(/^[\w-]+\/[\w\-+.]+$/, {
    message: 'contentType must be a valid MIME type',
  })
  contentType!: string;
}

/**
 * DTO for requesting a presigned download URL.
 */
export class PresignedDownloadDto {
  @ApiProperty({ description: 'S3 file key', example: 'tenant-id/inspections/uuid/photo.jpg' })
  @IsString()
  @IsNotEmpty()
  fileKey!: string;
}
