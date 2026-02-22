import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Refresh token (used in dev mode; production uses HTTP-only cookie)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
