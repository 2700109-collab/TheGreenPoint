import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-uuid' })
  @IsString()
  token!: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'Min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char',
  })
  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    {
      message:
        'Password must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character',
    },
  )
  newPassword!: string;
}
