import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DestructionService } from '../../src/destruction/destruction.service';
import { createMockPrisma, createMockAuditService, resetUuidCounter } from '@test/helpers/integration-helpers';

function buildDestructionService() {
  const prisma = createMockPrisma();
  const audit = createMockAuditService();
  const notifications = { send: vi.fn().mockResolvedValue(undefined) };
  const certificateGenerator = { generate: vi.fn().mockResolvedValue(undefined) };
  const eventEmitter = { emit: vi.fn() };

  const svc = new DestructionService(
    prisma,
    audit as any,
    notifications as any,
    certificateGenerator as any,
    eventEmitter as any,
  );

  return { svc, prisma, audit, notifications, certificateGenerator };
}

const TENANT = 'tenant-greenfields';
const USER = 'user-1';

describe('Destruction Flow (Integration)', () => {
  beforeEach(() => resetUuidCounter());

  describe('create', () => {
    it('creates destruction event with official witness and transitions plants', async () => {
      const { svc, prisma, audit, notifications } = buildDestructionService();

      (prisma.facility.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fac-1',
        name: 'Greenfields Farm',
        tenantId: TENANT,
      });
      (prisma.plant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'p1', state: 'flowering' },
        { id: 'p2', state: 'vegetative' },
      ]);
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.destructionEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'dest-1',
        facility: { name: 'Greenfields Farm' },
      });
      (prisma.plant.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

      const result = await svc.create(
        {
          facilityId: 'fac-1',
          entityType: 'plant',
          entityIds: ['p1', 'p2'],
          quantityKg: 5,
          destructionMethod: 'incineration',
          destructionDate: '2025-06-01',
          witnessNames: ['Officer Smith', 'Farm Manager'],
          witnessOrganizations: ['SAPS', 'Greenfields'],
          witnessSignatures: ['sig1', 'sig2'],
          reason: 'Disease detected',
        } as any,
        USER,
        'operator_admin',
        TENANT,
      );

      expect(result.id).toBe('dest-1');
      expect(prisma.plant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['p1', 'p2'] } },
          data: { state: 'destroyed' },
        }),
      );
      expect(audit.logInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'destruction.created' }),
      );
    });

    it('requires at least one official witness (SAPS, SAHPRA, or DALRRD)', async () => {
      const { svc, prisma } = buildDestructionService();

      (prisma.facility.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fac-1',
        name: 'Farm',
        tenantId: TENANT,
      });

      await expect(
        svc.create(
          {
            facilityId: 'fac-1',
            entityType: 'plant',
            entityIds: ['p1'],
            quantityKg: 1,
            destructionMethod: 'incineration',
            destructionDate: '2025-06-01',
            witnessNames: ['Random Person'],
            witnessOrganizations: ['Unknown Corp'], // No official org!
            witnessSignatures: ['sig'],
            reason: 'Test',
          } as any,
          USER,
          'operator',
          TENANT,
        ),
      ).rejects.toThrow('At least one witness must be from SAPS, SAHPRA, or DALRRD');
    });

    it('auto-notifies regulator for quantities > 10kg', async () => {
      const { svc, prisma, notifications } = buildDestructionService();

      (prisma.facility.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fac-1',
        name: 'Big Farm',
        tenantId: TENANT,
      });
      (prisma.batch.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'b1' }]);
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.destructionEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'dest-2',
        facility: { name: 'Big Farm' },
      });
      (prisma.destructionEvent.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await svc.create(
        {
          facilityId: 'fac-1',
          entityType: 'batch',
          entityIds: ['b1'],
          quantityKg: 15, // > 10kg threshold
          destructionMethod: 'composting',
          destructionDate: '2025-06-01',
          witnessNames: ['SAHPRA Officer'],
          witnessOrganizations: ['SAHPRA'],
          witnessSignatures: ['sig'],
          reason: 'Expired batch',
        } as any,
        USER,
        'operator_admin',
        TENANT,
      );

      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'destruction_large_quantity',
          role: 'regulator',
        }),
      );
      // Should update the event with regulatory notification timestamp
      expect(prisma.destructionEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            regulatoryNotified: true,
          }),
        }),
      );
    });

    it('rejects already-destroyed plants', async () => {
      const { svc, prisma } = buildDestructionService();

      (prisma.facility.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fac-1',
        name: 'Farm',
        tenantId: TENANT,
      });
      (prisma.plant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'p1', state: 'destroyed' },
      ]);

      await expect(
        svc.create(
          {
            facilityId: 'fac-1',
            entityType: 'plant',
            entityIds: ['p1'],
            quantityKg: 1,
            destructionMethod: 'incineration',
            destructionDate: '2025-06-01',
            witnessNames: ['Officer'],
            witnessOrganizations: ['SAPS'],
            witnessSignatures: ['sig'],
            reason: 'Test',
          } as any,
          USER,
          'operator',
          TENANT,
        ),
      ).rejects.toThrow("already in 'destroyed' state");
    });
  });
});
