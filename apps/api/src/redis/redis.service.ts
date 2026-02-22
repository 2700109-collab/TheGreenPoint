import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 3000),
      lazyConnect: true,
    });

    try {
      await this.client.connect();
      this.logger.log('Connected to Redis');
    } catch (err) {
      // HP-S1-006: Log at error level — Redis is a security dependency
      this.logger.error(
        `Redis not available — token blacklisting and rate limiting degraded: ${(err as Error).message}`,
      );
      this.client = null!;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  get isAvailable(): boolean {
    return !!this.client && this.client.status === 'ready';
  }

  // ── Key-Value Operations ─────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable) return false;
    return (await this.client.exists(key)) === 1;
  }

  // ── Counter Operations ───────────────────────────────────────────

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isAvailable) return 0;
    const count = await this.client.incr(key);
    if (ttlSeconds && count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  // ── Token Blacklist ──────────────────────────────────────────────

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable) {
      this.logger.error(`SECURITY: Cannot blacklist token ${jti} — Redis unavailable`);
    }
    await this.set(`blacklist:${jti}`, '1', ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (!this.isAvailable) {
      this.logger.error(`SECURITY: Cannot check token blacklist — Redis unavailable, allowing token`);
    }
    return this.exists(`blacklist:${jti}`);
  }

  // ── Login Attempts ───────────────────────────────────────────────

  async getLoginAttempts(email: string): Promise<number> {
    const val = await this.get(`login_attempts:${email.toLowerCase()}`);
    return val ? parseInt(val, 10) : 0;
  }

  async incrementLoginAttempts(email: string): Promise<number> {
    return this.incr(`login_attempts:${email.toLowerCase()}`, 900); // 15 min TTL
  }

  async clearLoginAttempts(email: string): Promise<void> {
    await this.del(`login_attempts:${email.toLowerCase()}`);
  }

  // ── Password Reset ───────────────────────────────────────────────

  async storeResetToken(token: string, userId: string): Promise<void> {
    await this.set(`reset_token:${token}`, userId, 3600); // 1 hour TTL
  }

  async getResetTokenUserId(token: string): Promise<string | null> {
    return this.get(`reset_token:${token}`);
  }

  async deleteResetToken(token: string): Promise<void> {
    await this.del(`reset_token:${token}`);
  }

  // ── Health Check ─────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
