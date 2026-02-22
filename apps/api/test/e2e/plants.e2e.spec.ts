/**
 * E2E Tests — Plants controller
 *
 * Controller-level tests verifying request → controller → service delegation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlantsController } from '../../src/plants/plants.controller';
import type { PlantsService } from '../../src/plants/plants.service';
import type { AuthenticatedUser } from '../../src/auth/auth.service';

function buildPlantsController() {
  const mockPlantsService = {
    create: vi.fn(),
    batchCreate: vi.fn(),
    findAll: vi.fn(),
    findAllForRegulator: vi.fn(),
    findOne: vi.fn(),
    updateState: vi.fn(),
  };
  const controller = new PlantsController(mockPlantsService as unknown as PlantsService);
  return { controller, mockPlantsService };
}

const TENANT = 'tenant-greenfields';

function operatorUser(): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'op@greenfields.co.za',
    role: 'operator_admin',
    tenantId: TENANT,
    permissions: [],
  };
}

function regulatorUser(): AuthenticatedUser {
  return {
    id: 'reg-1',
    email: 'inspector@sahpra.gov.za',
    role: 'regulator',
    tenantId: undefined as any,
    permissions: [],
  };
}

describe('Plants E2E', () => {
  describe('create', () => {
    it('delegates to service with tenantId', async () => {
      const { controller, mockPlantsService } = buildPlantsController();
      const mockPlant = {
        id: 'plant-1',
        trackingId: 'NCTS-ZA-2025-000001',
        state: 'seed',
      };
      mockPlantsService.create.mockResolvedValue(mockPlant);

      const result = await controller.create(TENANT, {
        strainId: 's1',
        facilityId: 'f1',
        zoneId: 'z1',
      } as any);

      expect(result.trackingId).toBe('NCTS-ZA-2025-000001');
      expect(mockPlantsService.create).toHaveBeenCalledWith(TENANT, expect.objectContaining({
        strainId: 's1',
      }));
    });
  });

  describe('batchCreate', () => {
    it('creates multiple plants and returns summary', async () => {
      const { controller, mockPlantsService } = buildPlantsController();
      mockPlantsService.batchCreate.mockResolvedValue({
        created: 3,
        plants: [
          { id: 'p1', trackingId: 'NCTS-ZA-2025-000001' },
          { id: 'p2', trackingId: 'NCTS-ZA-2025-000002' },
          { id: 'p3', trackingId: 'NCTS-ZA-2025-000003' },
        ],
      });

      const result = await controller.batchCreate(TENANT, {
        plants: [
          { strainId: 's1', facilityId: 'f1', zoneId: 'z1' },
          { strainId: 's1', facilityId: 'f1', zoneId: 'z1' },
          { strainId: 's1', facilityId: 'f1', zoneId: 'z2' },
        ],
      } as any);

      expect(result.created).toBe(3);
      expect(result.plants).toHaveLength(3);
    });
  });

  describe('findAll', () => {
    it('calls findAll with tenantId for operator', async () => {
      const { controller, mockPlantsService } = buildPlantsController();
      mockPlantsService.findAll.mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.findAll(operatorUser(), { page: 1, limit: 20 } as any);

      expect(mockPlantsService.findAll).toHaveBeenCalledWith(TENANT, expect.any(Object));
      expect(mockPlantsService.findAllForRegulator).not.toHaveBeenCalled();
    });

    it('calls findAllForRegulator for regulator role', async () => {
      const { controller, mockPlantsService } = buildPlantsController();
      mockPlantsService.findAllForRegulator.mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.findAll(regulatorUser(), { page: 1, limit: 20 } as any);

      expect(mockPlantsService.findAllForRegulator).toHaveBeenCalled();
      expect(mockPlantsService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('passes tenantId for operator, undefined for regulator', async () => {
      const { controller, mockPlantsService } = buildPlantsController();
      mockPlantsService.findOne.mockResolvedValue({ id: 'p1', state: 'vegetative' });

      // Operator gets scoped
      await controller.findOne('plant-id', operatorUser());
      expect(mockPlantsService.findOne).toHaveBeenCalledWith('plant-id', TENANT);

      mockPlantsService.findOne.mockClear();

      // Regulator sees all
      await controller.findOne('plant-id', regulatorUser());
      expect(mockPlantsService.findOne).toHaveBeenCalledWith('plant-id', undefined);
    });
  });

  describe('updateState', () => {
    it('transitions plant state via controller', async () => {
      const { controller, mockPlantsService } = buildPlantsController();
      mockPlantsService.updateState.mockResolvedValue({
        id: 'plant-1', state: 'seedling',
      });

      const result = await controller.updateState(
        'plant-1',
        TENANT,
        { state: 'seedling' } as any,
      );

      expect(result.state).toBe('seedling');
      expect(mockPlantsService.updateState).toHaveBeenCalledWith('plant-1', TENANT, { state: 'seedling' });
    });
  });
});
