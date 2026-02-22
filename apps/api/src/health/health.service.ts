import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { Prisma } from '@prisma/client';

interface ServiceCheck {
  status: 'up' | 'down';
  latencyMs: number;
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: ServiceCheck;
    redis: ServiceCheck;
    storage: ServiceCheck;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const allUp =
      database.status === 'up' &&
      redis.status === 'up' &&
      storage.status === 'up';

    return {
      status: allUp ? 'ok' : 'degraded',
      version: this.config.get<string>('APP_VERSION', '0.0.0'),
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: { database, redis, storage },
    };
  }

  private async checkDatabase(): Promise<ServiceCheck> {
    const start = performance.now();
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
      return { status: 'up', latencyMs: Math.round(performance.now() - start) };
    } catch (err) {
      this.logger.error(`Database health check failed: ${(err as Error).message}`);
      return { status: 'down', latencyMs: Math.round(performance.now() - start) };
    }
  }

  private async checkRedis(): Promise<ServiceCheck> {
    const start = performance.now();
    try {
      const ok = await this.redis.ping();
      return {
        status: ok ? 'up' : 'down',
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      this.logger.error(`Redis health check failed: ${(err as Error).message}`);
      return { status: 'down', latencyMs: Math.round(performance.now() - start) };
    }
  }

  private async checkStorage(): Promise<ServiceCheck> {
    const start = performance.now();
    try {
      const ok = await this.storage.healthCheck();
      return {
        status: ok ? 'up' : 'down',
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      this.logger.error(`Storage health check failed: ${(err as Error).message}`);
      return { status: 'down', latencyMs: Math.round(performance.now() - start) };
    }
  }
}
