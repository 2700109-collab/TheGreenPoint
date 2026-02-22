/**
 * E2E Tests — Auth controller
 *
 * Controller-level tests verifying request → controller → service delegation,
 * error mapping, and response structure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthController } from '../../src/auth/auth.controller';
import type { AuthService, AuthenticatedUser } from '../../src/auth/auth.service';

function buildAuthController() {
  const mockAuthService = {
    login: vi.fn(),
    register: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
  const controller = new AuthController(mockAuthService as unknown as AuthService);
  return { controller, mockAuthService };
}

function mockRequest(ip = '127.0.0.1'): any {
  return { ip, cookies: {} };
}

describe('Auth E2E', () => {
  describe('login', () => {
    it('returns tokens and user on successful login', async () => {
      const { controller, mockAuthService } = buildAuthController();
      const response = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 900,
        user: { id: 'u1', email: 'test@greenfields.co.za', role: 'operator' },
      };
      mockAuthService.login.mockResolvedValue(response);

      const result = await controller.login(
        { email: 'test@greenfields.co.za', password: 'SecureP@ss1' } as any,
        mockRequest(),
      );

      expect(result.accessToken).toBe('access-token-123');
      expect(result.user.email).toBe('test@greenfields.co.za');
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@greenfields.co.za',
        'SecureP@ss1',
        '127.0.0.1',
      );
    });

    it('propagates UnauthorizedException from service', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid email or password'));

      await expect(
        controller.login({ email: 'bad@test.co.za', password: 'wrong' } as any, mockRequest()),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('register', () => {
    it('creates user with temporary password', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.register.mockResolvedValue({
        id: 'new-user-1',
        email: 'new@greenfields.co.za',
        temporaryPassword: 'TmpP@ss123',
        forcePasswordChange: true,
      });

      const admin: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@greenfields.co.za',
        role: 'operator_admin',
        tenantId: 'tenant-1',
        permissions: [],
      };

      const result = await controller.register(
        { email: 'new@greenfields.co.za', firstName: 'New', lastName: 'User', role: 'operator' } as any,
        admin,
      );

      expect(result.email).toBe('new@greenfields.co.za');
      expect(result.forcePasswordChange).toBe(true);
    });
  });

  describe('refresh', () => {
    it('returns new token pair from body token', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      const result = await controller.refresh(
        { refreshToken: 'valid-refresh-token' } as any,
        mockRequest(),
      );

      expect(result.accessToken).toBe('new-access-token');
      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('throws UnauthorizedException if no refresh token', async () => {
      const { controller } = buildAuthController();

      await expect(
        controller.refresh({ refreshToken: '' } as any, mockRequest()),
      ).rejects.toThrow('Refresh token is required');
    });

    it('reads refresh token from cookie when body is empty', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.refreshAccessToken.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', expiresIn: 900,
      });
      const req = { ip: '127.0.0.1', cookies: { refresh_token: 'cookie-rt' } };

      await controller.refresh({ refreshToken: '' } as any, req as any);

      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('cookie-rt');
    });
  });

  describe('logout', () => {
    it('returns success message', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.logout.mockResolvedValue(undefined);
      const user: AuthenticatedUser = {
        id: 'u1', email: 'test@test.co.za', role: 'operator', tenantId: 't1', permissions: [],
      };

      const result = await controller.logout(
        'Bearer some-token',
        { refreshToken: 'rt' } as any,
        mockRequest(),
        user,
      );

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalledWith('some-token', 'rt', user);
    });
  });

  describe('forgot-password', () => {
    it('returns generic message regardless of email existence', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const result = await controller.forgotPassword({ email: 'maybe@test.co.za' } as any);

      expect(result.message).toContain('If an account exists');
    });
  });

  describe('reset-password', () => {
    it('returns success message on valid reset', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewSecure@P1',
      } as any);

      expect(result.message).toContain('Password reset successfully');
    });
  });

  describe('change-password', () => {
    it('calls changePassword with extracted JTI', async () => {
      const { controller, mockAuthService } = buildAuthController();
      mockAuthService.changePassword.mockResolvedValue(undefined);

      // Create a fake JWT with jti
      const payload = Buffer.from(JSON.stringify({ jti: 'test-jti-1' })).toString('base64url');
      const fakeToken = `header.${payload}.signature`;

      const user: AuthenticatedUser = {
        id: 'user-1', email: 'test@test.co.za', role: 'operator', tenantId: 't1', permissions: [],
      };

      const result = await controller.changePassword(
        { currentPassword: 'OldP@ss1', newPassword: 'NewP@ss1' } as any,
        user,
        `Bearer ${fakeToken}`,
      );

      expect(result.message).toBe('Password changed successfully');
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-1', 'OldP@ss1', 'NewP@ss1', 'test-jti-1',
      );
    });
  });
});
