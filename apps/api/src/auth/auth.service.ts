import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../redis/redis.service';
import { KeyManager } from '../common/encryption/key-manager';

// ── Interfaces ─────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  jti: string;
  email: string;
  role: string;
  tenantId?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId?: string;
    tenantName?: string;
    forcePasswordChange: boolean;
  };
}

export interface RegisterResponse {
  id: string;
  email: string;
  temporaryPassword: string;
  forcePasswordChange: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MIN = 15;
const LOCKOUT_DURATION_SEC = LOCKOUT_DURATION_MIN * 60;
const PASSWORD_HISTORY_SIZE = 3;
/** Redis key prefix for per-user token version (invalidate all sessions) */
const TOKEN_VERSION_PREFIX = 'token_version:';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpirySec: number;
  private readonly refreshTokenExpirySec: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditService: AuditService,
    private readonly keyManager: KeyManager,
  ) {
    this.accessTokenExpirySec = parseInt(
      this.configService.get('JWT_EXPIRATION_SEC', '900'),
      10,
    ); // 15 minutes default
    this.refreshTokenExpirySec = parseInt(
      this.configService.get('JWT_REFRESH_EXPIRATION_SEC', '604800'),
      10,
    ); // 7 days default

    // Block dev fallback secrets in production
    if (this.configService.get('NODE_ENV') === 'production') {
      const refreshSecret = this.configService.get('JWT_REFRESH_SECRET', 'ncts-dev-refresh-secret');
      if (refreshSecret === 'ncts-dev-refresh-secret') {
        throw new Error(
          'CRITICAL: JWT_REFRESH_SECRET is not set in production! Refusing to start with dev fallback secret.',
        );
      }
    }
  }

  // ── Login ────────────────────────────────────────────────────────

  async login(email: string, password: string, ip?: string): Promise<LoginResponse> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check brute-force lockout via Redis
    const attempts = await this.redis.getLoginAttempts(normalizedEmail);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      // HP-S1-007: Return 429 with retryAfter instead of 401
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many login attempts. Try again in ${LOCKOUT_DURATION_MIN} minutes.`,
          retryAfter: LOCKOUT_DURATION_SEC,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Find user (case-insensitive)
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!user || !user.passwordHash) {
      await this.redis.incrementLoginAttempts(normalizedEmail);
      // HP-S1-001: Audit failed login (unknown user)
      await this.createAuditEvent(
        'anonymous', null, 'system', 'user.login_failed',
        { ip, email: normalizedEmail, reason: 'unknown_user' },
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        // HP-S1-001: Audit failed login (locked account)
        await this.createAuditEvent(
          user.id, user.tenantId, user.role, 'user.login_failed',
          { ip, email: user.email, reason: 'account_locked' },
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Account is locked. Try again after ${user.lockedUntil.toISOString()}`,
            retryAfter: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Auto-unlock: lockout has expired
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isLocked: false, failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // Check if account is active
    if (!user.isActive) {
      await this.createAuditEvent(
        user.id, user.tenantId, user.role, 'user.login_failed',
        { ip, email: user.email, reason: 'account_deactivated' },
      );
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const newAttempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: newAttempts };

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.isLocked = true;
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_SEC * 1000);
        this.logger.warn(`Account locked for ${user.email} after ${newAttempts} failed attempts`);
      }

      await this.prisma.user.update({ where: { id: user.id }, data: updateData });
      await this.redis.incrementLoginAttempts(normalizedEmail);

      // HP-S1-001: Audit failed login (wrong password)
      await this.createAuditEvent(
        user.id, user.tenantId, user.role, 'user.login_failed',
        { ip, email: user.email, reason: 'invalid_password', attemptNumber: newAttempts },
      );

      throw new UnauthorizedException('Invalid email or password');
    }

    // RC-S1-002: Wrap successful login DB writes + audit in a transaction
    const tokens = this.generateTokenPair(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          isLocked: false,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ip || null,
        },
      });

      await this.createAuditEventInTx(
        tx, user.id, user.tenantId, user.role, 'user.login',
        { ip, email: user.email },
      );
    });

    await this.redis.clearLoginAttempts(normalizedEmail);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId || undefined,
        tenantName: user.tenant?.name,
        forcePasswordChange: user.forcePasswordChange,
      },
    };
  }

  // ── Register (Admin-only) ───────────────────────────────────────

  async register(
    dto: { email: string; firstName: string; lastName: string; role: string; tenantId?: string },
    actingUser: AuthenticatedUser,
  ): Promise<RegisterResponse> {
    if (!['operator_admin', 'regulator', 'admin'].includes(actingUser.role)) {
      throw new ForbiddenException('Only admins and regulators can register new users');
    }

    if (actingUser.role === 'operator_admin') {
      if (!dto.tenantId || dto.tenantId !== actingUser.tenantId) {
        throw new ForbiddenException('You can only create users in your own organization');
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

    // RC-S1-002: Wrap user creation + audit in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          tenantId: dto.tenantId || null,
          passwordHash,
          forcePasswordChange: true,
          isActive: true,
        },
      });

      await this.createAuditEventInTx(
        tx, actingUser.id, dto.tenantId, actingUser.role, 'user.created',
        { newUserId: newUser.id, email: newUser.email, role: newUser.role },
      );

      return newUser;
    });

    this.logger.log(`User ${user.email} registered by ${actingUser.email}`);

    return { id: user.id, email: user.email, temporaryPassword, forcePasswordChange: true };
  }

  // ── Refresh Token ───────────────────────────────────────────────

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', 'ncts-dev-refresh-secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (await this.redis.isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // RC-S1-004: Check per-user token version for session invalidation
    const currentVersion = await this.redis.get(`${TOKEN_VERSION_PREFIX}${payload.sub}`);
    if (currentVersion) {
      // If a version exists, any token issued before the version bump is invalid
      const tokenIat = payload.iat;
      if (tokenIat && tokenIat < parseInt(currentVersion, 10)) {
        throw new UnauthorizedException('Session has been invalidated');
      }
    }

    // Blacklist old refresh token (rotation)
    const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 3600;
    await this.redis.blacklistToken(payload.jti, Math.max(ttl, 1));

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.isLocked) {
      throw new UnauthorizedException('Account is no longer active');
    }

    return this.generateTokenPair(user);
  }

  // ── Logout ──────────────────────────────────────────────────────

  // RC-S1-003: Accept and blacklist both access and refresh tokens
  async logout(accessToken: string, refreshToken: string | undefined, user: AuthenticatedUser): Promise<void> {
    // Blacklist access token
    try {
      const payload = this.jwtService.decode(accessToken) as JwtPayload | null;
      if (payload?.jti) {
        const ttl = payload.exp
          ? payload.exp - Math.floor(Date.now() / 1000)
          : this.accessTokenExpirySec;
        await this.redis.blacklistToken(payload.jti, Math.max(ttl, 1));
      }
    } catch {
      // Token may already be invalid — fine for logout
    }

    // RC-S1-003: Blacklist refresh token too
    if (refreshToken) {
      try {
        const refreshPayload = this.jwtService.verify<JwtPayload>(refreshToken, {
          secret: this.configService.get('JWT_REFRESH_SECRET', 'ncts-dev-refresh-secret'),
        });
        if (refreshPayload?.jti) {
          const ttl = refreshPayload.exp
            ? refreshPayload.exp - Math.floor(Date.now() / 1000)
            : this.refreshTokenExpirySec;
          await this.redis.blacklistToken(refreshPayload.jti, Math.max(ttl, 1));
        }
      } catch {
        // Refresh token may be invalid; best-effort blacklist
      }
    }

    await this.createAuditEvent(user.id, user.tenantId, user.role, 'user.logout', { email: user.email });
  }

  // ── Change Password ─────────────────────────────────────────────

  // RC-S1-004: Invalidate all other sessions after password change
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentJti?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Unable to change password');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check password history
    for (const oldHash of user.passwordHistory) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        throw new BadRequestException('Cannot reuse any of your last 3 passwords');
      }
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updatedHistory = [user.passwordHash, ...user.passwordHistory.slice(0, PASSWORD_HISTORY_SIZE - 1)];

    // RC-S1-002: Wrap password update + audit in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, passwordHistory: updatedHistory, forcePasswordChange: false },
      });

      await this.createAuditEventInTx(
        tx, userId, user.tenantId, user.role, 'user.password_changed',
        { email: user.email, initiatingJti: currentJti },
      );
    });

    // RC-S1-004: Invalidate all sessions for this user by bumping token version
    // All sessions (including current) are invalidated — user must re-authenticate
    await this.redis.set(
      `${TOKEN_VERSION_PREFIX}${userId}`,
      Math.floor(Date.now() / 1000).toString(),
      this.refreshTokenExpirySec, // Expire when longest-lived tokens would
    );

    this.logger.log(`Password changed for user ${user.email}, all other sessions invalidated`);
  }

  // ── Forgot Password ─────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user || !user.isActive) {
      this.logger.debug(`Forgot-password for unknown/inactive email: ${normalizedEmail}`);
      return; // No enumeration
    }

    const token = randomUUID();
    await this.redis.storeResetToken(token, user.id);

    this.logger.log(`Password reset token for ${user.email}: ${token} (would be emailed in production)`);

    await this.createAuditEvent(
      user.id, user.tenantId, user.role, 'user.password_reset_requested',
      { email: user.email },
    );
  }

  // ── Reset Password ──────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redis.getResetTokenUserId(token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordHash && await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('Cannot reuse your current password');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updatedHistory = user.passwordHash
      ? [user.passwordHash, ...user.passwordHistory.slice(0, PASSWORD_HISTORY_SIZE - 1)]
      : user.passwordHistory;

    // RC-S1-002: Wrap in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          passwordHistory: updatedHistory,
          forcePasswordChange: false,
          failedLoginAttempts: 0,
          isLocked: false,
          lockedUntil: null,
        },
      });

      await this.createAuditEventInTx(
        tx, userId, user.tenantId, user.role, 'user.password_reset',
        { email: user.email },
      );
    });

    await this.redis.deleteResetToken(token);

    // Invalidate all sessions after password reset
    await this.redis.set(
      `${TOKEN_VERSION_PREFIX}${userId}`,
      Math.floor(Date.now() / 1000).toString(),
      this.refreshTokenExpirySec,
    );
  }

  // ── Token Validation (for Passport strategy) ────────────────────

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    if (payload.type !== 'access') {
      return null;
    }

    if (payload.jti && await this.redis.isTokenBlacklisted(payload.jti)) {
      return null;
    }

    // RC-S1-004: Check per-user token version for session invalidation
    const currentVersion = await this.redis.get(`${TOKEN_VERSION_PREFIX}${payload.sub}`);
    if (currentVersion) {
      const tokenIat = payload.iat;
      if (tokenIat && tokenIat < parseInt(currentVersion, 10)) {
        return null;
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      permissions: [],
    };
  }

  // ── Helper: Generate Token Pair ─────────────────────────────────

  private generateTokenPair(user: {
    id: string;
    email: string;
    role: string;
    tenantId?: string | null;
  }): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessPayload: Record<string, unknown> = {
      sub: user.id,
      jti: accessJti,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || undefined,
      type: 'access',
    };

    const refreshPayload: Record<string, unknown> = {
      sub: user.id,
      jti: refreshJti,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || undefined,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.accessTokenExpirySec,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', 'ncts-dev-refresh-secret'),
      expiresIn: this.refreshTokenExpirySec,
    });

    return { accessToken, refreshToken, expiresIn: this.accessTokenExpirySec };
  }

  // ── Helper: Generate Temporary Password (LP-S1-001: crypto-secure) ──

  private generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    const bytes = randomBytes(16);
    let password = '';
    // Guarantee at least one from each category
    password += upper[bytes[0]! % upper.length];
    password += lower[bytes[1]! % lower.length];
    password += digits[bytes[2]! % digits.length];
    password += special[bytes[3]! % special.length];

    for (let i = 4; i < 16; i++) {
      password += all[bytes[i]! % all.length];
    }

    // Shuffle using Fisher-Yates with crypto random
    const shuffleBytes = randomBytes(password.length);
    const arr = password.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = shuffleBytes[i]! % (i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr.join('');
  }

  // ── Helper: Create Audit Event (standalone — for non-transactional use) ──

  private async createAuditEvent(
    userId: string,
    tenantId: string | null | undefined,
    actorRole: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.log({
      userId,
      tenantId: tenantId || null,
      userRole: actorRole,
      action,
      entityType: 'user',
      entityId: userId,
      metadata,
      ipAddress: (metadata.ip as string) || undefined,
    });
  }

  // ── Helper: Create Audit Event inside a Prisma transaction ──────

  private async createAuditEventInTx(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userId: string,
    tenantId: string | null | undefined,
    actorRole: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.logInTx(tx, {
      userId,
      tenantId: tenantId || null,
      userRole: actorRole,
      action,
      entityType: 'user',
      entityId: userId,
      metadata,
      ipAddress: (metadata.ip as string) || undefined,
    });
  }

  // ── Section 9.3 — MFA Secret Encryption ─────────────────────────

  /**
   * Encrypt an MFA secret before storing in the database.
   * Used when enabling TOTP-based MFA for a user.
   */
  encryptMfaSecret(secret: string): string {
    return this.keyManager.encryptField(secret);
  }

  /**
   * Decrypt a stored MFA secret for TOTP verification.
   */
  decryptMfaSecret(encrypted: string): string {
    return this.keyManager.decryptField(encrypted);
  }
}
