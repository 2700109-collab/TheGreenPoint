import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../../src/audit/audit.service';
import { createMockPrisma, resetUuidCounter } from '@test/helpers/integration-helpers';
import { computeEventHash, GENESIS_HASH } from '@ncts/audit-lib';

function buildAuditService() {
  const prisma = createMockPrisma();
  const svc = new AuditService(prisma);
  return { svc, prisma };
}

const TENANT = 'tenant-greenfields';

describe('Audit Chain (Integration)', () => {
  beforeEach(() => resetUuidCounter());

  describe('log', () => {
    it('creates event with hash chain linked to genesis hash when first event', async () => {
      const { svc, prisma } = buildAuditService();

      // No previous events → GENESIS_HASH
      (prisma.auditEvent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.auditEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await svc.log({
        tenantId: TENANT,
        userId: 'user-1',
        userRole: 'operator',
        entityType: 'plant',
        entityId: 'plant-1',
        action: 'plant.created',
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousHash: GENESIS_HASH,
            eventHash: expect.any(String),
            entityType: 'plant',
            action: 'plant.created',
            actorId: 'user-1',
          }),
        }),
      );
    });

    it('chains to previous event hash when events exist', async () => {
      const { svc, prisma } = buildAuditService();
      const prevHash = 'abc123def456';

      (prisma.auditEvent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        eventHash: prevHash,
      });
      (prisma.auditEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await svc.log({
        tenantId: TENANT,
        userId: 'user-2',
        entityType: 'transfer',
        entityId: 'trf-1',
        action: 'transfer.created',
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousHash: prevHash,
          }),
        }),
      );
    });

    it('propagates creation errors', async () => {
      const { svc, prisma } = buildAuditService();
      (prisma.auditEvent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.auditEvent.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(
        svc.log({
          userId: 'user-1',
          entityType: 'plant',
          entityId: 'p1',
          action: 'plant.created',
        }),
      ).rejects.toThrow('DB connection lost');
    });
  });

  describe('verifyChain', () => {
    it('returns verified=true for empty chain', async () => {
      const { svc, prisma } = buildAuditService();
      (prisma.auditEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await svc.verifyChain({ tenantId: TENANT });

      expect(result.verified).toBe(true);
      expect(result.totalEvents).toBe(0);
      expect(result.brokenLinks).toHaveLength(0);
    });

    it('detects tampered event hash', async () => {
      const { svc, prisma } = buildAuditService();

      const createdAt = new Date('2025-01-15T10:00:00Z');
      const event = {
        id: 'evt-1',
        entityType: 'plant',
        entityId: 'plant-1',
        action: 'plant.created',
        actorId: 'user-1',
        payload: {},
        previousHash: GENESIS_HASH,
        eventHash: 'tampered-hash-value', // Wrong!
        createdAt,
      };

      (prisma.auditEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([event]);

      const result = await svc.verifyChain({ tenantId: TENANT });

      expect(result.verified).toBe(false);
      expect(result.brokenLinks).toHaveLength(1);
      expect(result.brokenLinks[0]!.eventId).toBe('evt-1');
    });

    it('detects broken chain linkage between events', async () => {
      const { svc, prisma } = buildAuditService();

      const createdAt1 = new Date('2025-01-15T10:00:00Z');
      const createdAt2 = new Date('2025-01-15T10:01:00Z');

      // First event is valid
      const hash1 = computeEventHash({
        id: 'evt-1',
        entityType: 'plant',
        entityId: 'plant-1',
        action: 'plant.created',
        actorId: 'user-1',
        payload: {},
        previousHash: GENESIS_HASH,
        createdAt: createdAt1.toISOString(),
      });

      const event1 = {
        id: 'evt-1',
        entityType: 'plant',
        entityId: 'plant-1',
        action: 'plant.created',
        actorId: 'user-1',
        payload: {},
        previousHash: GENESIS_HASH,
        eventHash: hash1,
        createdAt: createdAt1,
      };

      // Second event has wrong previousHash (should be hash1)
      const hash2 = computeEventHash({
        id: 'evt-2',
        entityType: 'plant',
        entityId: 'plant-2',
        action: 'plant.created',
        actorId: 'user-1',
        payload: {},
        previousHash: 'wrong-previous-hash', // Broken link!
        createdAt: createdAt2.toISOString(),
      });

      const event2 = {
        id: 'evt-2',
        entityType: 'plant',
        entityId: 'plant-2',
        action: 'plant.created',
        actorId: 'user-1',
        payload: {},
        previousHash: 'wrong-previous-hash',
        eventHash: hash2,
        createdAt: createdAt2,
      };

      (prisma.auditEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([event1, event2]);

      const result = await svc.verifyChain({ tenantId: TENANT });

      expect(result.verified).toBe(false);
      expect(result.brokenLinks.length).toBeGreaterThanOrEqual(1);
      // The break is at event2 due to previousHash mismatch
      const brokenAtEvt2 = result.brokenLinks.find((b) => b.eventId === 'evt-2');
      expect(brokenAtEvt2).toBeDefined();
    });

    it('verifies valid chain successfully', async () => {
      const { svc, prisma } = buildAuditService();

      const createdAt1 = new Date('2025-01-15T10:00:00Z');
      const createdAt2 = new Date('2025-01-15T10:01:00Z');

      const hash1 = computeEventHash({
        id: 'evt-1',
        entityType: 'plant',
        entityId: 'plant-1',
        action: 'plant.created',
        actorId: 'user-1',
        payload: {},
        previousHash: GENESIS_HASH,
        createdAt: createdAt1.toISOString(),
      });

      const hash2 = computeEventHash({
        id: 'evt-2',
        entityType: 'plant',
        entityId: 'plant-2',
        action: 'plant.created',
        actorId: 'user-1',
        payload: {},
        previousHash: hash1, // Correctly chained
        createdAt: createdAt2.toISOString(),
      });

      (prisma.auditEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'evt-1',
          entityType: 'plant',
          entityId: 'plant-1',
          action: 'plant.created',
          actorId: 'user-1',
          payload: {},
          previousHash: GENESIS_HASH,
          eventHash: hash1,
          createdAt: createdAt1,
        },
        {
          id: 'evt-2',
          entityType: 'plant',
          entityId: 'plant-2',
          action: 'plant.created',
          actorId: 'user-1',
          payload: {},
          previousHash: hash1,
          eventHash: hash2,
          createdAt: createdAt2,
        },
      ]);

      const result = await svc.verifyChain({ tenantId: TENANT });

      expect(result.verified).toBe(true);
      expect(result.totalEvents).toBe(2);
      expect(result.brokenLinks).toHaveLength(0);
    });
  });
});
