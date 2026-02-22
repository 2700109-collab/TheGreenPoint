import {
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const REGISTERABLE_ROLES = [
  'operator_admin',
  'operator_staff',
  'regulator',
  'inspector',
  'lab_technician',
] as const;

export class RegisterDto {
  @ApiProperty({ example: 'newuser@greenfields.co.za' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Botha' })
  @IsString()
  lastName!: string;

  @ApiProperty({
    enum: REGISTERABLE_ROLES,
    example: 'operator_staff',
  })
  @IsEnum(REGISTERABLE_ROLES)
  role!: string;

  @ApiPropertyOptional({ description: 'Required for operator roles' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
