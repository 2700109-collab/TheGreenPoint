/**
 * Integration test helper — creates lightweight mock objects for NestJS services
 * that simulate real service interactions without requiring a live database.
 *
 * For true database integration tests, use Testcontainers:
 *   const { prisma } = await setupTestDb();
 *
 * For service-level integration tests (this file), use mock factories.
 */
import { vi } from 'vitest';

// ── UUID helper ──────────────────────────────────────────────────
let uuidCounter = 0;
export function fakeUuid(): string {
  uuidCounter++;
  return `00000000-0000-4000-a000-${String(uuidCounter).padStart(12, '0')}`;
}

export function resetUuidCounter(): void {
  uuidCounter = 0;
}

// ── Prisma mock builder ─────────────────────────────────────────
export function createMockPrisma() {
  const mockTxClient: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};

  const proxy = new Proxy(
    {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        // Provide the same mock methods inside the transaction
        return fn(proxy);
      }),
      $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    } as Record<string, unknown>,
    {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        // Auto-create model mocks on access
        if (!target[prop]) {
          target[prop] = {
            create: vi.fn().mockResolvedValue({ id: fakeUuid() }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            findMany: vi.fn().mockResolvedValue([]),
            findFirst: vi.fn().mockResolvedValue(null),
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            delete: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
            aggregate: vi.fn().mockResolvedValue({ _sum: {}, _count: 0 }),
            groupBy: vi.fn().mockResolvedValue([]),
            upsert: vi.fn().mockResolvedValue({}),
          };
        }
        return target[prop];
      },
    },
  );

  return proxy as any;
}

// ── Redis mock ──────────────────────────────────────────────────
export function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: vi.fn().mockImplementation(async (key: string) => store.get(key) || null),
    set: vi.fn().mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: vi.fn().mockImplementation(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    getLoginAttempts: vi.fn().mockResolvedValue(0),
    incrementLoginAttempts: vi.fn().mockResolvedValue(1),
    clearLoginAttempts: vi.fn().mockResolvedValue(undefined),
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
    blacklistToken: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue(true),
    _store: store,
  } as any;
}

// ── Audit service mock ──────────────────────────────────────────
export function createMockAuditService() {
  return {
    log: vi.fn().mockResolvedValue(undefined),
    logInTx: vi.fn().mockResolvedValue(undefined),
    logAction: vi.fn().mockResolvedValue(undefined),
    createEvent: vi.fn().mockResolvedValue({ id: fakeUuid() }),
  };
}

// ── Test user factory ───────────────────────────────────────────
export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  passwordHash: string;
  isActive: boolean;
  isLocked: boolean;
  lockedUntil: Date | null;
  failedLoginAttempts: number;
  forcePasswordChange: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  tenant: { id: string; name: string } | null;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = overrides.id || fakeUuid();
  const tenantId = overrides.tenantId ?? fakeUuid();
  return {
    id,
    email: overrides.email || `user-${id.slice(-4)}@test.co.za`,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    role: overrides.role || 'operator',
    tenantId,
    // bcrypt hash of 'Test@1234567890'
    passwordHash:
      overrides.passwordHash ||
      '$2a$12$LJ3m4YQxmOcE0j1mY3Qw6u1e5rD.PjqHqbGlYK5XKxtZy0kT2SYWW',
    isActive: overrides.isActive ?? true,
    isLocked: overrides.isLocked ?? false,
    lockedUntil: overrides.lockedUntil ?? null,
    failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
    forcePasswordChange: overrides.forcePasswordChange ?? false,
    lastLoginAt: overrides.lastLoginAt ?? null,
    lastLoginIp: overrides.lastLoginIp ?? null,
    tenant: tenantId
      ? { id: tenantId, name: overrides.tenant?.name || 'Test Org' }
      : null,
  };
}

// ── Test facility / plant / batch factories ─────────────────────
export function createTestFacility(overrides: Record<string, unknown> = {}) {
  const id = (overrides.id as string) || fakeUuid();
  return {
    id,
    name: overrides.name || 'Test Facility',
    tenantId: overrides.tenantId || fakeUuid(),
    facilityType: overrides.facilityType || 'medicinal_cultivation',
    address: overrides.address || '123 Test St, Cape Town',
    latitude: overrides.latitude ?? -33.9,
    longitude: overrides.longitude ?? 18.4,
    isActive: overrides.isActive ?? true,
    ...overrides,
  };
}

export function createTestPlant(overrides: Record<string, unknown> = {}) {
  const id = (overrides.id as string) || fakeUuid();
  return {
    id,
    trackingId: overrides.trackingId || `NCTS-ZA-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
    tenantId: overrides.tenantId || fakeUuid(),
    strainId: overrides.strainId || fakeUuid(),
    facilityId: overrides.facilityId || fakeUuid(),
    zoneId: overrides.zoneId || fakeUuid(),
    state: overrides.state || 'seed',
    plantedDate: overrides.plantedDate || new Date(),
    ...overrides,
  };
}

export function createTestBatch(overrides: Record<string, unknown> = {}) {
  const id = (overrides.id as string) || fakeUuid();
  return {
    id,
    batchNumber: overrides.batchNumber || `BCH-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
    tenantId: overrides.tenantId || fakeUuid(),
    facilityId: overrides.facilityId || fakeUuid(),
    batchType: overrides.batchType || 'dried_flower',
    wetWeightGrams: overrides.wetWeightGrams ?? 5000,
    dryWeightGrams: overrides.dryWeightGrams ?? 1500,
    processedWeightGrams: overrides.processedWeightGrams ?? 1200,
    labResultId: overrides.labResultId ?? null,
    createdAt: overrides.createdAt || new Date(),
    ...overrides,
  };
}
