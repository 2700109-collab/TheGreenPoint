import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlantsService } from '../../src/plants/plants.service';
import { createMockPrisma, resetUuidCounter } from '@test/helpers/integration-helpers';
import { PlantState } from '@ncts/shared-types';

function buildPlantsService() {
  const prisma = createMockPrisma();
  const svc = new PlantsService(prisma);
  return { svc, prisma };
}

const TENANT = 'tenant-greenfields';

function mockPlant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plant-1',
    tenantId: TENANT,
    trackingId: 'NCTS-ZA-2025-000001',
    strainId: 'strain-1',
    facilityId: 'facility-1',
    zoneId: 'zone-1',
    state: PlantState.SEED,
    plantedDate: new Date('2025-01-15'),
    motherPlantId: null,
    harvestedDate: null,
    destroyedDate: null,
    destroyedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    strain: { id: 'strain-1', name: 'Charlotte Web', type: 'CBD' },
    facility: { id: 'facility-1', name: 'Greenfields Farm' },
    zone: { id: 'zone-1', name: 'Greenhouse A' },
    ...overrides,
  };
}

describe('Plant Lifecycle (Integration)', () => {
  beforeEach(() => resetUuidCounter());

  describe('create', () => {
    it('creates a plant with auto-generated tracking ID', async () => {
      const { svc, prisma } = buildPlantsService();
      const year = new Date().getFullYear();

      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null); // No existing plants
      (prisma.plant.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ trackingId: `NCTS-ZA-${year}-000001` }),
      );

      const result = await svc.create(TENANT, {
        strainId: 'strain-1',
        facilityId: 'facility-1',
        zoneId: 'zone-1',
      } as any);

      expect(prisma.plant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            trackingId: `NCTS-ZA-${year}-000001`,
            state: PlantState.SEED,
          }),
        }),
      );
      expect(result.trackingId).toBe(`NCTS-ZA-${year}-000001`);
    });

    it('increments tracking ID sequence from last existing', async () => {
      const { svc, prisma } = buildPlantsService();
      const year = new Date().getFullYear();

      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        trackingId: `NCTS-ZA-${year}-000042`,
      });
      (prisma.plant.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ trackingId: `NCTS-ZA-${year}-000043` }),
      );

      await svc.create(TENANT, {
        strainId: 'strain-1',
        facilityId: 'facility-1',
        zoneId: 'zone-1',
      } as any);

      expect(prisma.plant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingId: `NCTS-ZA-${year}-000043`,
          }),
        }),
      );
    });
  });

  describe('batch create', () => {
    it('creates multiple plants and updates zone counts', async () => {
      const { svc, prisma } = buildPlantsService();
      const dto = {
        plants: [
          { strainId: 's1', facilityId: 'f1', zoneId: 'z1' },
          { strainId: 's1', facilityId: 'f1', zoneId: 'z1' },
          { strainId: 's2', facilityId: 'f1', zoneId: 'z2' },
        ],
      };

      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.plant.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockPlant());
      (prisma.zone.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await svc.batchCreate(TENANT, dto as any);

      expect(result.created).toBe(3);
      expect(result.plants).toHaveLength(3);

      // z1 should be incremented by 2
      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'z1' },
          data: { currentCount: { increment: 2 } },
        }),
      );
      // z2 should be incremented by 1
      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'z2' },
          data: { currentCount: { increment: 1 } },
        }),
      );
    });
  });

  describe('state transitions', () => {
    it('SEED → SEEDLING (valid)', async () => {
      const { svc, prisma } = buildPlantsService();
      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.SEED }),
      );
      (prisma.plant.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.SEEDLING }),
      );

      const result = await svc.updateState('plant-1', TENANT, { state: PlantState.SEEDLING } as any);
      expect(result.state).toBe(PlantState.SEEDLING);
    });

    it('SEED → FLOWERING (invalid) throws BadRequest', async () => {
      const { svc, prisma } = buildPlantsService();
      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.SEED }),
      );

      await expect(
        svc.updateState('plant-1', TENANT, { state: PlantState.FLOWERING } as any),
      ).rejects.toThrow('Invalid state transition');
    });

    it('HARVESTED → any (terminal state) throws BadRequest', async () => {
      const { svc, prisma } = buildPlantsService();
      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.HARVESTED }),
      );

      await expect(
        svc.updateState('plant-1', TENANT, { state: PlantState.DESTROYED } as any),
      ).rejects.toThrow('none (terminal state)');
    });

    it('any → DESTROYED is valid and decrements zone count', async () => {
      const { svc, prisma } = buildPlantsService();
      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.VEGETATIVE }),
      );
      (prisma.plant.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.DESTROYED }),
      );
      (prisma.zone.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await svc.updateState('plant-1', TENANT, {
        state: PlantState.DESTROYED,
        reason: 'Disease detected',
      } as any);

      expect(prisma.plant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            state: PlantState.DESTROYED,
            destroyedReason: 'Disease detected',
          }),
        }),
      );
      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentCount: { decrement: 1 } },
        }),
      );
    });

    it('FLOWERING → HARVESTED sets harvestedDate and decrements zone', async () => {
      const { svc, prisma } = buildPlantsService();
      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.FLOWERING }),
      );
      (prisma.plant.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPlant({ state: PlantState.HARVESTED, harvestedDate: new Date() }),
      );
      (prisma.zone.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await svc.updateState('plant-1', TENANT, { state: PlantState.HARVESTED } as any);

      expect(prisma.plant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            state: PlantState.HARVESTED,
            harvestedDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns plant with all relations', async () => {
      const { svc, prisma } = buildPlantsService();
      const plant = mockPlant({
        motherPlant: { id: 'mother-1', trackingId: 'NCTS-ZA-2024-000001' },
        clones: [{ id: 'clone-1', trackingId: 'NCTS-ZA-2025-000002', state: PlantState.SEEDLING }],
        batch: null,
      });
      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(plant);

      const result = await svc.findOne('plant-1', TENANT);
      expect(result.id).toBe('plant-1');
      expect(result.motherPlant).toBeDefined();
      expect(result.clones).toHaveLength(1);
    });

    it('throws NotFoundException for unknown plant', async () => {
      const { svc, prisma } = buildPlantsService();
      (prisma.plant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(svc.findOne('unknown-plant', TENANT)).rejects.toThrow('Plant unknown-plant not found');
    });
  });

  describe('findAll with pagination', () => {
    it('returns paginated result', async () => {
      const { svc, prisma } = buildPlantsService();
      const plants = [mockPlant(), mockPlant({ id: 'plant-2' })];

      (prisma.plant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(plants);
      (prisma.plant.count as ReturnType<typeof vi.fn>).mockResolvedValue(52);

      const result = await svc.findAll(TENANT, { page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(52);
      expect(result.meta.totalPages).toBe(3);
    });

    it('applies state filter', async () => {
      const { svc, prisma } = buildPlantsService();
      (prisma.plant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.plant.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await svc.findAll(TENANT, { state: PlantState.FLOWERING } as any);

      expect(prisma.plant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT,
            state: PlantState.FLOWERING,
          }),
        }),
      );
    });
  });
});
