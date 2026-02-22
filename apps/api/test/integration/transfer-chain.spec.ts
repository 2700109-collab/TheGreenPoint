import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransfersService } from '../../src/transfers/transfers.service';
import { createMockPrisma, resetUuidCounter } from '@test/helpers/integration-helpers';

function buildTransfersService() {
  const prisma = createMockPrisma();
  const svc = new TransfersService(prisma);
  return { svc, prisma };
}

const TENANT_A = 'tenant-sender';
const TENANT_B = 'tenant-receiver';

function mockTransfer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trf-1',
    tenantId: TENANT_A,
    transferNumber: 'TRF-2025-000001',
    senderTenantId: TENANT_A,
    senderFacilityId: 'fac-a1',
    receiverTenantId: TENANT_B,
    receiverFacilityId: 'fac-b1',
    status: 'pending',
    initiatedAt: new Date(),
    completedAt: null,
    vehicleRegistration: 'GP-123-456',
    driverName: 'John Doe',
    driverIdNumber: '9001015009084',
    notes: 'Initial transfer',
    items: [
      {
        id: 'item-1',
        batchId: 'batch-1',
        quantityGrams: 1000,
        receivedQuantityGrams: null,
        batch: { id: 'batch-1', batchNumber: 'BATCH-2025-000001' },
      },
    ],
    ...overrides,
  };
}

describe('Transfer Chain (Integration)', () => {
  beforeEach(() => resetUuidCounter());

  describe('create', () => {
    it('creates a transfer with correct number and items', async () => {
      const { svc, prisma } = buildTransfersService();

      (prisma.facility.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: 'fac-a1', name: 'Sender Facility' }) // sender
        .mockResolvedValueOnce({ id: 'fac-b1', name: 'Receiver Facility' }); // receiver
      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'batch-1' });
      (prisma.transfer.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      // $transaction should execute the callback with the prisma client
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.transfer.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransfer());

      const result = await svc.create(TENANT_A, {
        senderFacilityId: 'fac-a1',
        receiverTenantId: TENANT_B,
        receiverFacilityId: 'fac-b1',
        items: [{ batchId: 'batch-1', quantityGrams: 1000 }],
        vehicleRegistration: 'GP-123-456',
        driverName: 'John Doe',
        driverIdNumber: '9001015009084',
      } as any);

      expect(result.status).toBe('pending');
      expect(result.items).toHaveLength(1);
    });

    it('throws when sender facility not found', async () => {
      const { svc, prisma } = buildTransfersService();
      (prisma.facility.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        svc.create(TENANT_A, {
          senderFacilityId: 'unknown',
          receiverTenantId: TENANT_B,
          receiverFacilityId: 'fac-b1',
          items: [],
        } as any),
      ).rejects.toThrow('Sender facility unknown not found');
    });

    it('throws when batch not found', async () => {
      const { svc, prisma } = buildTransfersService();
      (prisma.facility.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: 'fac-a1' })
        .mockResolvedValueOnce({ id: 'fac-b1' });
      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        svc.create(TENANT_A, {
          senderFacilityId: 'fac-a1',
          receiverTenantId: TENANT_B,
          receiverFacilityId: 'fac-b1',
          items: [{ batchId: 'bad-batch', quantityGrams: 500 }],
        } as any),
      ).rejects.toThrow('Batch bad-batch not found');
    });
  });

  describe('accept', () => {
    it('accepts transfer and detects no discrepancy when weights match', async () => {
      const { svc, prisma } = buildTransfersService();
      const transfer = mockTransfer({
        items: [{ id: 'item-1', batchId: 'b1', quantityGrams: 1000, receivedQuantityGrams: null }],
      });

      (prisma.transfer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(transfer);
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.transferItem.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.transfer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...transfer,
        status: 'accepted',
        completedAt: new Date(),
      });

      const result = await svc.accept('trf-1', TENANT_B, {
        receivedItems: [{ transferItemId: 'item-1', receivedQuantityGrams: 1000 }],
      } as any);

      expect(result.status).toBe('accepted');
      // No compliance alert should be created (≤2% threshold)
      expect(prisma.complianceRule.findFirst).not.toHaveBeenCalled();
    });

    it('creates compliance alert when discrepancy > 2%', async () => {
      const { svc, prisma } = buildTransfersService();
      const transfer = mockTransfer({
        items: [{ id: 'item-1', batchId: 'b1', quantityGrams: 1000, receivedQuantityGrams: null }],
      });

      (prisma.transfer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(transfer);
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.transferItem.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      // Simulate rule creation (first time)
      (prisma.complianceRule.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.complianceRule.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rule-1' });
      (prisma.complianceAlert.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.transfer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...transfer,
        status: 'accepted',
      });

      await svc.accept('trf-1', TENANT_B, {
        receivedItems: [{ transferItemId: 'item-1', receivedQuantityGrams: 950 }], // 5% discrepancy
      } as any);

      expect(prisma.complianceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: 'warning',
            alertType: 'transfer_discrepancy',
          }),
        }),
      );
    });

    it('marks >10% discrepancy as critical severity', async () => {
      const { svc, prisma } = buildTransfersService();
      const transfer = mockTransfer({
        items: [{ id: 'item-1', batchId: 'b1', quantityGrams: 1000, receivedQuantityGrams: null }],
      });

      (prisma.transfer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(transfer);
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.transferItem.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.complianceRule.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rule-1' });
      (prisma.complianceAlert.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.transfer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...transfer,
        status: 'accepted',
      });

      await svc.accept('trf-1', TENANT_B, {
        receivedItems: [{ transferItemId: 'item-1', receivedQuantityGrams: 800 }], // 20% discrepancy
      } as any);

      expect(prisma.complianceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ severity: 'critical' }),
        }),
      );
    });
  });

  describe('reject', () => {
    it('rejects transfer and records reason', async () => {
      const { svc, prisma } = buildTransfersService();
      const transfer = mockTransfer();

      (prisma.transfer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(transfer);
      (prisma.transfer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...transfer,
        status: 'rejected',
        notes: 'Initial transfer\nRejection reason: Damaged goods',
      });

      const result = await svc.reject('trf-1', TENANT_B, {
        reason: 'Damaged goods',
      } as any);

      expect(result.status).toBe('rejected');
      expect(result.notes).toContain('Rejection reason: Damaged goods');
    });

    it('throws when pending transfer not found', async () => {
      const { svc, prisma } = buildTransfersService();
      (prisma.transfer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        svc.reject('unknown', TENANT_B, { reason: 'test' } as any),
      ).rejects.toThrow('Pending transfer unknown not found');
    });
  });

  describe('findOne', () => {
    it('returns transfer with detail for sender', async () => {
      const { svc, prisma } = buildTransfersService();
      const transfer = mockTransfer({
        tenant: { id: TENANT_A, name: 'Sender Corp', tradingName: null },
      });
      (prisma.transfer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(transfer);

      const result = await svc.findOne('trf-1', TENANT_A);
      expect(result.id).toBe('trf-1');
    });

    it('throws NotFoundException for unknown transfer', async () => {
      const { svc, prisma } = buildTransfersService();
      (prisma.transfer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(svc.findOne('unknown', TENANT_A)).rejects.toThrow('Transfer unknown not found');
    });
  });
});
