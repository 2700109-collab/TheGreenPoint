import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 8.2 — Record consent DTO.
 */
export class RecordConsentDto {
  @ApiProperty({
    enum: ['data_processing', 'marketing', 'analytics', 'third_party_sharing'],
    description: 'Type of consent being granted or denied',
  })
  @IsString()
  @IsIn(['data_processing', 'marketing', 'analytics', 'third_party_sharing'])
  consentType!: string;

  @ApiProperty({ description: 'Whether consent is granted' })
  @IsBoolean()
  granted!: boolean;

  @ApiProperty({ description: 'Version of the privacy policy the user accepted' })
  @IsString()
  policyVersion!: string;
}

/**
 * Section 8.2 — Data deletion request DTO.
 */
export class DataDeletionRequestDto {
  @ApiProperty({
    enum: ['full', 'marketing_only', 'analytics_only'],
    description: 'Scope of data to be deleted/anonymized',
  })
  @IsString()
  @IsIn(['full', 'marketing_only', 'analytics_only'])
  scope!: string;

  @ApiPropertyOptional({ description: 'Reason for deletion request' })
  @IsString()
  @IsOptional()
  reason?: string;
}
