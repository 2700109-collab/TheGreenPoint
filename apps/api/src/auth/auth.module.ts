import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'ncts-dev-secret-change-in-production'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRY', '15m') as any,
        },
      }),
    }),
  ],
  providers: [JwtStrategy, AuthService, RolesGuard, TenantGuard],
  exports: [AuthService, RolesGuard, TenantGuard, PassportModule, JwtModule],
})
export class AuthModule {}
