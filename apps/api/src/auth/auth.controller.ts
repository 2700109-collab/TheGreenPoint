import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { FastifyRequest } from 'fastify';
import { AuthService, LoginResponse, RegisterResponse, AuthenticatedUser } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/login ────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ login: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts — includes Retry-After header' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
  ): Promise<LoginResponse> {
    return this.authService.login(dto.email, dto.password, req.ip);
  }

  // ── POST /auth/register ─────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SkipThrottle()
  @Roles('operator_admin', 'regulator', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new user (admin-only)' })
  @ApiResponse({ status: 201, description: 'User created with temporary password' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RegisterResponse> {
    return this.authService.register(dto, user);
  }

  // ── POST /auth/refresh ──────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'New access token issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: FastifyRequest,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // In dev: accept token from body. In production: read from cookie.
    const token =
      dto.refreshToken ||
      (req.cookies as Record<string, string>)?.['refresh_token'];

    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshAccessToken(token);
  }

  // ── POST /auth/logout ───────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current session (blacklists both access and refresh tokens)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Headers('authorization') authHeader: string,
    @Body() body: RefreshTokenDto,
    @Req() req: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const accessToken = authHeader?.replace('Bearer ', '') || '';
    // Accept refresh token from body or cookie
    const refreshToken =
      body.refreshToken ||
      (req.cookies as Record<string, string>)?.['refresh_token'] ||
      undefined;

    await this.authService.logout(accessToken, refreshToken, user);
    return { message: 'Logged out successfully' };
  }

  // ── POST /auth/change-password ──────────────────────────────────

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password (invalidates all other sessions)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('authorization') authHeader: string,
  ): Promise<{ message: string }> {
    const currentJti = this.extractJtiFromHeader(authHeader);
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword, currentJti);
    return { message: 'Password changed successfully' };
  }

  // ── POST /auth/forgot-password ──────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ login: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiResponse({ status: 200, description: 'If account exists, reset link sent' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account exists, a reset link has been sent' };
  }

  // ── POST /auth/reset-password ───────────────────────────────────

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  // ── Private helpers ─────────────────────────────────────────────

  private extractJtiFromHeader(authHeader: string): string | undefined {
    try {
      const token = authHeader?.replace('Bearer ', '');
      if (!token) return undefined;
      const parts = token.split('.');
      if (parts.length !== 3) return undefined;
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString());
      return payload.jti;
    } catch {
      return undefined;
    }
  }
}
