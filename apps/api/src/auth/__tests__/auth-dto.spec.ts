import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

// ── LoginDto ─────────────────────────────────────────────────
describe('LoginDto', () => {
  const valid = { email: 'user@test.co.za', password: 'P@ssword123!' };

  it('accepts valid login', async () => {
    await expectValid(LoginDto, valid);
  });

  it('rejects missing email', async () => {
    await expectInvalid(LoginDto, { password: 'P@ssword123!' }, ['email']);
  });

  it('rejects invalid email format', async () => {
    await expectInvalid(LoginDto, { email: 'not-email', password: 'P@ssword123!' }, ['email']);
  });

  it('rejects missing password', async () => {
    await expectInvalid(LoginDto, { email: 'user@test.co.za' }, ['password']);
  });

  it('rejects empty password', async () => {
    await expectInvalid(LoginDto, { email: 'user@test.co.za', password: '' }, ['password']);
  });
});

// ── RegisterDto ──────────────────────────────────────────────
describe('RegisterDto', () => {
  const valid = {
    email: 'new@greenfields.co.za',
    firstName: 'John',
    lastName: 'Doe',
    role: 'operator_admin',
  };

  it('accepts valid registration', async () => {
    await expectValid(RegisterDto, valid);
  });

  it('accepts with optional tenantId', async () => {
    await expectValid(RegisterDto, {
      ...valid,
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('rejects invalid email', async () => {
    await expectInvalid(RegisterDto, { ...valid, email: 'bad' }, ['email']);
  });

  it('rejects missing firstName', async () => {
    const { firstName, ...rest } = valid;
    await expectInvalid(RegisterDto, rest, ['firstName']);
  });

  it('rejects missing lastName', async () => {
    const { lastName, ...rest } = valid;
    await expectInvalid(RegisterDto, rest, ['lastName']);
  });

  it('rejects invalid role', async () => {
    await expectInvalid(RegisterDto, { ...valid, role: 'super_admin' }, ['role']);
  });

  it('rejects non-UUID tenantId', async () => {
    await expectInvalid(RegisterDto, { ...valid, tenantId: 'not-uuid' }, ['tenantId']);
  });
});

// ── RefreshTokenDto ──────────────────────────────────────────
describe('RefreshTokenDto', () => {
  it('accepts with refreshToken', async () => {
    await expectValid(RefreshTokenDto, { refreshToken: 'some-token-value' });
  });

  it('accepts without refreshToken (cookie fallback)', async () => {
    await expectValid(RefreshTokenDto, {});
  });
});

// ── ForgotPasswordDto ────────────────────────────────────────
describe('ForgotPasswordDto', () => {
  it('accepts valid email', async () => {
    await expectValid(ForgotPasswordDto, { email: 'user@test.co.za' });
  });

  it('rejects invalid email', async () => {
    await expectInvalid(ForgotPasswordDto, { email: 'not-email' }, ['email']);
  });

  it('rejects missing email', async () => {
    await expectInvalid(ForgotPasswordDto, {}, ['email']);
  });
});

// ── ResetPasswordDto ─────────────────────────────────────────
describe('ResetPasswordDto', () => {
  const valid = { token: 'abc123', newPassword: 'Str0ng!Pass#2025' };

  it('accepts valid reset password', async () => {
    await expectValid(ResetPasswordDto, valid);
  });

  it('rejects missing token', async () => {
    await expectInvalid(ResetPasswordDto, { newPassword: valid.newPassword }, ['token']);
  });

  it('rejects short password (< 12 chars)', async () => {
    await expectInvalid(ResetPasswordDto, { token: 'abc', newPassword: 'Sh0rt!' }, ['newPassword']);
  });

  it('rejects password without uppercase', async () => {
    await expectInvalid(ResetPasswordDto, { token: 'abc', newPassword: 'alllowercase1!!' }, ['newPassword']);
  });

  it('rejects password without digit', async () => {
    await expectInvalid(ResetPasswordDto, { token: 'abc', newPassword: 'NoDigitsHere!!' }, ['newPassword']);
  });

  it('rejects password without special char', async () => {
    await expectInvalid(ResetPasswordDto, { token: 'abc', newPassword: 'NoSpecialChar1A' }, ['newPassword']);
  });
});

// ── ChangePasswordDto ────────────────────────────────────────
describe('ChangePasswordDto', () => {
  const valid = { currentPassword: 'OldP@ss123!!', newPassword: 'NewStr0ng!Pass#' };

  it('accepts valid change password', async () => {
    await expectValid(ChangePasswordDto, valid);
  });

  it('rejects missing currentPassword', async () => {
    await expectInvalid(ChangePasswordDto, { newPassword: valid.newPassword }, ['currentPassword']);
  });

  it('rejects weak newPassword', async () => {
    await expectInvalid(ChangePasswordDto, { currentPassword: 'old', newPassword: 'weak' }, [
      'newPassword',
    ]);
  });
});
