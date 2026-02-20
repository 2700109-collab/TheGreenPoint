import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;          // user ID
  email: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Validate and decode a JWT token payload into an AuthenticatedUser.
   * In production, this would verify against Cognito JWKS endpoint.
   */
  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      permissions: payload.permissions || [],
    };
  }

  /**
   * Generate a JWT access token (for development/testing).
   * In production, Cognito issues tokens — this is used for local dev only.
   */
  generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Generate a refresh token with longer expiry.
   */
  generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' },
    );
  }
}
