/**
 * E2E Tests — Health controller
 *
 * Tests the controller → service → response flow.
 * Uses direct instantiation (ESBuild doesn't support emitDecoratorMetadata
 * so NestJS DI can't resolve constructor tokens in vitest).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthController } from '../../src/health/health.controller';
import type { HealthService, HealthCheckResult } from '../../src/health/health.service';

describe('Health E2E', () => {
  let controller: HealthController;
  let mockHealthService: { check: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockHealthService = { check: vi.fn() };
    controller = new HealthController(mockHealthService as unknown as HealthService);
  });

  it('returns ok status when all services are healthy', async () => {
    mockHealthService.check.mockResolvedValue({
      status: 'ok',
      version: '0.0.0',
      uptime: 120,
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'up', latencyMs: 5 },
        redis: { status: 'up', latencyMs: 2 },
        storage: { status: 'up', latencyMs: 15 },
      },
    } satisfies HealthCheckResult);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.checks.database.status).toBe('up');
    expect(result.checks.redis.status).toBe('up');
    expect(result.checks.storage.status).toBe('up');
  });

  it('returns degraded status when a service is down', async () => {
    mockHealthService.check.mockResolvedValue({
      status: 'degraded',
      version: '0.0.0',
      uptime: 120,
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'up', latencyMs: 5 },
        redis: { status: 'down', latencyMs: 0 },
        storage: { status: 'up', latencyMs: 15 },
      },
    });

    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.checks.redis.status).toBe('down');
  });

  it('delegates entirely to HealthService.check()', async () => {
    mockHealthService.check.mockResolvedValue({
      status: 'ok', checks: { database: { status: 'up', latencyMs: 1 }, redis: { status: 'up', latencyMs: 1 }, storage: { status: 'up', latencyMs: 1 } }, version: '0.0.0', uptime: 0, timestamp: '',
    });
    await controller.check();
    expect(mockHealthService.check).toHaveBeenCalledOnce();
  });
});
