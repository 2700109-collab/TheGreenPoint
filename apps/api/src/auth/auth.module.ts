import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET', 'ncts-dev-secret-change-in-production');
        if (
          config.get('NODE_ENV') === 'production' &&
          secret === 'ncts-dev-secret-change-in-production'
        ) {
          throw new Error(
            'CRITICAL: JWT_SECRET is not set in production! Refusing to start with dev fallback secret.',
          );
        }
        return {
          secret,
          signOptions: {
            // ms StringValue branded type requires explicit cast from config string
            expiresIn: config.get<string>('JWT_EXPIRATION', '15m') as `${number}m`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, AuthService, RolesGuard, TenantGuard],
  exports: [AuthService, RolesGuard, TenantGuard, PassportModule, JwtModule],
})
export class AuthModule {}
