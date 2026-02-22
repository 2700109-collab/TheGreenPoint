import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HarvestsService } from '../../src/harvests/harvests.service';
import { LabResultsService } from '../../src/lab-results/lab-results.service';
import { SalesService } from '../../src/sales/sales.service';
import { createMockPrisma, resetUuidCounter } from '@test/helpers/integration-helpers';
import { PlantState, BatchType } from '@ncts/shared-types';

// ── Helpers ────────────────────────────────────────────────────
const TENANT = 'tenant-greenfields';

function mockBatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'batch-1',
    tenantId: TENANT,
    batchNumber: 'BATCH-2025-000001',
    batchType: BatchType.HARVEST,
    strainId: 'strain-1',
    facilityId: 'fac-1',
    plantCount: 10,
    wetWeightGrams: 5000,
    dryWeightGrams: 1200,
    processedWeightGrams: null,
    labResultId: null,
    createdDate: new Date(),
    ...overrides,
  };
}

// ── Harvest Tests ──────────────────────────────────────────────
describe('Harvest → Batch → Sale Chain (Integration)', () => {
  beforeEach(() => resetUuidCounter());

  describe('Harvest create', () => {
    it('creates harvest, batch, and transitions plants to HARVESTED', async () => {
      const prisma = createMockPrisma();
      const svc = new HarvestsService(prisma);

      const plants = [
        { id: 'p1', state: PlantState.FLOWERING, strainId: 'strain-1', trackingId: 'NCTS-ZA-2025-000001' },
        { id: 'p2', state: PlantState.FLOWERING, strainId: 'strain-1', trackingId: 'NCTS-ZA-2025-000002' },
      ];

      (prisma.plant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(plants);
      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null); // No existing batches

      // $transaction executes the callback
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.batch.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockBatch());
      (prisma.harvest.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'harvest-1',
        batchId: 'batch-1',
        batch: mockBatch(),
        facility: { id: 'fac-1', name: 'Farm A' },
      });
      (prisma.plant.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

      const result = await svc.create(TENANT, {
        plantIds: ['p1', 'p2'],
        facilityId: 'fac-1',
        wetWeightGrams: 5000,
        dryWeightGrams: 1200,
      } as any);

      expect(result.batchId).toBe('batch-1');
      expect(prisma.plant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['p1', 'p2'] } },
          data: expect.objectContaining({ state: PlantState.HARVESTED }),
        }),
      );
    });

    it('rejects non-FLOWERING plants', async () => {
      const prisma = createMockPrisma();
      const svc = new HarvestsService(prisma);

      (prisma.plant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'p1', state: PlantState.SEED, trackingId: 'NCTS-ZA-2025-000001' },
      ]);

      await expect(
        svc.create(TENANT, {
          plantIds: ['p1'],
          facilityId: 'fac-1',
          wetWeightGrams: 500,
        } as any),
      ).rejects.toThrow('Plants must be in FLOWERING state');
    });

    it('rejects when some plant IDs not found', async () => {
      const prisma = createMockPrisma();
      const svc = new HarvestsService(prisma);

      (prisma.plant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'p1', state: PlantState.FLOWERING },
      ]);

      await expect(
        svc.create(TENANT, {
          plantIds: ['p1', 'p2', 'p3'],
          facilityId: 'fac-1',
          wetWeightGrams: 5000,
        } as any),
      ).rejects.toThrow('Found 1 of 3');
    });
  });

  // ── Lab Results ────────────────────────────────────────────────
  describe('Lab Result submission', () => {
    it('creates lab result and links to batch', async () => {
      const prisma = createMockPrisma();
      const svc = new LabResultsService(prisma);
      const batch = mockBatch({ labResultId: null });

      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(batch);
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.labResult.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'lr-1',
        status: 'pass',
        thcPercent: 0.3,
        cbdPercent: 15.2,
      });
      (prisma.batch.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await svc.create(TENANT, {
        batchId: 'batch-1',
        labName: 'CannaTech Labs',
        labAccreditationNumber: 'SANAS-12345',
        thcPercent: 0.3,
        cbdPercent: 15.2,
        pesticidesPass: true,
        heavyMetalsPass: true,
        microbialsPass: true,
        mycotoxinsPass: true,
      } as any);

      expect(result.status).toBe('pass');
      expect(prisma.batch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'batch-1' },
          data: { labResultId: 'lr-1' },
        }),
      );
    });

    it('sets status to fail when any test fails', async () => {
      const prisma = createMockPrisma();
      const svc = new LabResultsService(prisma);

      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockBatch({ labResultId: null }));
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      );
      (prisma.labResult.create as ReturnType<typeof vi.fn>).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'lr-2',
        status: args.data.status,
      }));
      (prisma.batch.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await svc.create(TENANT, {
        batchId: 'batch-1',
        labName: 'CannaTech Labs',
        labAccreditationNumber: 'SANAS-12345',
        thcPercent: 0.8,
        cbdPercent: 12.1,
        pesticidesPass: true,
        heavyMetalsPass: false, // FAIL
        microbialsPass: true,
        mycotoxinsPass: true,
      } as any);

      expect(result.status).toBe('fail');
    });

    it('rejects batch that already has lab results', async () => {
      const prisma = createMockPrisma();
      const svc = new LabResultsService(prisma);

      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBatch({ labResultId: 'existing-lr' }),
      );

      await expect(
        svc.create(TENANT, { batchId: 'batch-1' } as any),
      ).rejects.toThrow('already has lab results');
    });
  });

  // ── Sales ──────────────────────────────────────────────────────
  describe('Sale creation', () => {
    it('records sale with inventory deduction', async () => {
      const prisma = createMockPrisma();
      const eventEmitter = { emit: vi.fn() };
      const svc = new SalesService(prisma, eventEmitter as any);

      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBatch({ dryWeightGrams: 1200, wetWeightGrams: 5000 }),
      );
      (prisma.facility.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fac-1' });
      (prisma.sale.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { quantityGrams: 200 },
      });
      (prisma.sale.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'SALE-2025-000001',
        quantityGrams: 500,
        priceZar: 2500,
      });

      const result = await svc.create(TENANT, {
        batchId: 'batch-1',
        facilityId: 'fac-1',
        quantityGrams: 500,
        priceZar: 2500,
      } as any);

      expect(result.saleNumber).toBe('SALE-2025-000001');
      expect(eventEmitter.emit).toHaveBeenCalledWith('sale.created', expect.objectContaining({
        saleId: 'sale-1',
        quantityGrams: 500,
      }));
    });

    it('rejects sale exceeding available inventory', async () => {
      const prisma = createMockPrisma();
      const eventEmitter = { emit: vi.fn() };
      const svc = new SalesService(prisma, eventEmitter as any);

      (prisma.batch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBatch({ dryWeightGrams: 1200, wetWeightGrams: 5000 }),
      );
      (prisma.facility.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fac-1' });
      (prisma.sale.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { quantityGrams: 1100 }, // Only 100g available
      });

      await expect(
        svc.create(TENANT, {
          batchId: 'batch-1',
          facilityId: 'fac-1',
          quantityGrams: 500, // Wants 500g but only 100g available
          priceZar: 2500,
        } as any),
      ).rejects.toThrow('Insufficient inventory');
    });
  });
});
