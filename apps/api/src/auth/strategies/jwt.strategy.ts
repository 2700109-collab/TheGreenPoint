import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import type { JwtPayload, AuthenticatedUser } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>(
      'JWT_SECRET',
      'ncts-dev-secret-change-in-production',
    );

    if (
      configService.get('NODE_ENV') === 'production' &&
      secret === 'ncts-dev-secret-change-in-production'
    ) {
      throw new Error(
        'CRITICAL: JWT_SECRET is not set in production! Refusing to start with dev fallback secret.',
      );
    }

    // In production with Cognito, use:
    // secretOrKeyProvider with jwks-rsa to fetch public key from Cognito JWKS endpoint
    // const cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      // For Cognito production:
      // issuer: cognitoIssuer,
      // algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
