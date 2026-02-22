import { describe, it, expect, vi } from 'vitest';
import { ThcLimitEvaluator } from '../engine/evaluators/thc-limit.evaluator';
import { WetDryRatioEvaluator } from '../engine/evaluators/wet-dry-ratio.evaluator';
import { ZoneCapacityEvaluator } from '../engine/evaluators/zone-capacity.evaluator';
import { ProductionLimitEvaluator } from '../engine/evaluators/production-limit.evaluator';
import { DestructionComplianceEvaluator } from '../engine/evaluators/destruction-compliance.evaluator';
import { PermitActivityScopeEvaluator } from '../engine/evaluators/permit-activity-scope.evaluator';

// ──────── THC Limit (R002) ──────────
describe('ThcLimitEvaluator (R002)', () => {
  function createMockPrisma() {
    return {
      labResult: { findUnique: vi.fn().mockResolvedValue(null) },
    };
  }

  it('passes when no entityId provided', async () => {
    const prisma = createMockPrisma();
    const evaluator = new ThcLimitEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(true);
  });

  it('passes for hemp below 0.2% THC', async () => {
    const prisma = createMockPrisma();
    prisma.labResult.findUnique.mockResolvedValue({
      id: 'lr-1',
      thcPercent: 0.15,
      batches: [{ id: 'b-1', facility: { facilityType: 'hemp_cultivation' } }],
    });
    const evaluator = new ThcLimitEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'lr-1' });
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('fails for hemp above 0.2% THC with quarantine action', async () => {
    const prisma = createMockPrisma();
    prisma.labResult.findUnique.mockResolvedValue({
      id: 'lr-1',
      thcPercent: 0.5,
      batches: [{ id: 'b-1', facility: { facilityType: 'hemp_cultivation' } }],
    });
    const evaluator = new ThcLimitEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'lr-1' });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.autoAction?.type).toBe('quarantine_batch');
  });

  it('passes for medicinal cannabis (threshold 100%)', async () => {
    const prisma = createMockPrisma();
    prisma.labResult.findUnique.mockResolvedValue({
      id: 'lr-1',
      thcPercent: 25,
      batches: [{ id: 'b-1', facility: { facilityType: 'medicinal_cultivation' } }],
    });
    const evaluator = new ThcLimitEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'lr-1' });
    expect(result.passed).toBe(true);
  });

  it('has ruleCode R002 and evaluationType real_time', () => {
    const evaluator = new ThcLimitEvaluator({} as any);
    expect(evaluator.ruleCode).toBe('R002');
    expect(evaluator.evaluationType).toBe('real_time');
  });
});

// ──────── Wet-Dry Ratio (R006) ──────────
describe('WetDryRatioEvaluator (R006)', () => {
  function createMockPrisma() {
    return {
      harvest: { findUnique: vi.fn().mockResolvedValue(null) },
    };
  }

  it('passes when no entityId', async () => {
    const prisma = createMockPrisma();
    const evaluator = new WetDryRatioEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(true);
  });

  it('passes for normal ratio (3:1)', async () => {
    const prisma = createMockPrisma();
    prisma.harvest.findUnique.mockResolvedValue({
      id: 'h-1',
      wetWeightGrams: 3000,
      dryWeightGrams: 1000,
      facilityId: 'f-1',
      facility: { name: 'Farm A' },
    });
    const evaluator = new WetDryRatioEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'h-1' });
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('warns for ratio just outside normal (1.8:1)', async () => {
    const prisma = createMockPrisma();
    prisma.harvest.findUnique.mockResolvedValue({
      id: 'h-1',
      wetWeightGrams: 1800,
      dryWeightGrams: 1000,
      facilityId: 'f-1',
      facility: { name: 'Farm A' },
    });
    const evaluator = new WetDryRatioEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'h-1' });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.description).toContain('BELOW');
  });

  it('warns for ratio above normal (7.5:1)', async () => {
    const prisma = createMockPrisma();
    prisma.harvest.findUnique.mockResolvedValue({
      id: 'h-1',
      wetWeightGrams: 7500,
      dryWeightGrams: 1000,
      facilityId: 'f-1',
      facility: { name: 'Farm A' },
    });
    const evaluator = new WetDryRatioEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'h-1' });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.description).toContain('ABOVE');
  });

  it('critical for extreme low ratio (1.2:1) with auto-action', async () => {
    const prisma = createMockPrisma();
    prisma.harvest.findUnique.mockResolvedValue({
      id: 'h-1',
      wetWeightGrams: 1200,
      dryWeightGrams: 1000,
      facilityId: 'f-1',
      facility: { name: 'Farm A' },
    });
    const evaluator = new WetDryRatioEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'h-1' });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.autoAction?.type).toBe('flag_facility_for_audit');
  });

  it('critical for extreme high ratio (10:1)', async () => {
    const prisma = createMockPrisma();
    prisma.harvest.findUnique.mockResolvedValue({
      id: 'h-1',
      wetWeightGrams: 10000,
      dryWeightGrams: 1000,
      facilityId: 'f-1',
      facility: { name: 'Farm A' },
    });
    const evaluator = new WetDryRatioEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'h-1' });
    expect(result.severity).toBe('critical');
    expect(result.autoAction).toBeDefined();
  });

  it('skips harvest with null dry weight', async () => {
    const prisma = createMockPrisma();
    prisma.harvest.findUnique.mockResolvedValue({
      id: 'h-1',
      wetWeightGrams: 5000,
      dryWeightGrams: null,
      facilityId: 'f-1',
      facility: { name: 'Farm A' },
    });
    const evaluator = new WetDryRatioEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'h-1' });
    expect(result.passed).toBe(true);
    expect(result.description).toContain('Incomplete');
  });
});

// ──────── Zone Capacity (R010) ──────────
describe('ZoneCapacityEvaluator (R010)', () => {
  function createMockPrisma() {
    return {
      zone: { findUnique: vi.fn().mockResolvedValue(null) },
      plant: { count: vi.fn().mockResolvedValue(0) },
    };
  }

  it('passes when no zoneId in metadata', async () => {
    const evaluator = new ZoneCapacityEvaluator({} as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(true);
  });

  it('passes when zone has no capacity limit', async () => {
    const prisma = createMockPrisma();
    prisma.zone.findUnique.mockResolvedValue({
      id: 'z-1',
      name: 'Zone A',
      capacity: null,
      facility: { name: 'Farm A' },
    });
    const evaluator = new ZoneCapacityEvaluator(prisma as any);
    const result = await evaluator.evaluate({
      tenantId: 'tenant-1',
      metadata: { zoneId: 'z-1' },
    });
    expect(result.passed).toBe(true);
  });

  it('passes with space available (50%)', async () => {
    const prisma = createMockPrisma();
    prisma.zone.findUnique.mockResolvedValue({
      id: 'z-1',
      name: 'Zone A',
      capacity: 100,
      facility: { name: 'Farm A' },
    });
    prisma.plant.count.mockResolvedValue(50);
    const evaluator = new ZoneCapacityEvaluator(prisma as any);
    const result = await evaluator.evaluate({
      tenantId: 'tenant-1',
      metadata: { zoneId: 'z-1' },
    });
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('warns when near capacity (>=90%)', async () => {
    const prisma = createMockPrisma();
    prisma.zone.findUnique.mockResolvedValue({
      id: 'z-1',
      name: 'Zone A',
      capacity: 100,
      facility: { name: 'Farm A' },
    });
    prisma.plant.count.mockResolvedValue(92);
    const evaluator = new ZoneCapacityEvaluator(prisma as any);
    const result = await evaluator.evaluate({
      tenantId: 'tenant-1',
      metadata: { zoneId: 'z-1' },
    });
    expect(result.passed).toBe(true); // Not blocked yet
    expect(result.severity).toBe('warning');
    expect(result.description).toContain('nearly full');
  });

  it('blocks when at capacity (100%)', async () => {
    const prisma = createMockPrisma();
    prisma.zone.findUnique.mockResolvedValue({
      id: 'z-1',
      name: 'Zone A',
      capacity: 100,
      facility: { name: 'Farm A' },
    });
    prisma.plant.count.mockResolvedValue(100);
    const evaluator = new ZoneCapacityEvaluator(prisma as any);
    const result = await evaluator.evaluate({
      tenantId: 'tenant-1',
      metadata: { zoneId: 'z-1' },
    });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.autoAction?.type).toBe('block_operation');
  });
});

// ──────── Production Limit (R008) ──────────
describe('ProductionLimitEvaluator (R008)', () => {
  function createMockPrisma() {
    return {
      permit: { findMany: vi.fn().mockResolvedValue([]) },
      plant: { count: vi.fn().mockResolvedValue(0) },
    };
  }

  it('passes when no permits with quantity limits', async () => {
    const evaluator = new ProductionLimitEvaluator(createMockPrisma() as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(true);
    expect(result.description).toContain('No quantity limits');
  });

  it('passes when well below limit', async () => {
    const prisma = createMockPrisma();
    prisma.permit.findMany.mockResolvedValue([
      { id: 'p-1', maxAnnualQuantityKg: 100, permitType: 'cultivation' },
    ]);
    prisma.plant.count.mockResolvedValue(100); // 100/(100*10)=10%
    const evaluator = new ProductionLimitEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('warns at 90% utilization', async () => {
    const prisma = createMockPrisma();
    prisma.permit.findMany.mockResolvedValue([
      { id: 'p-1', maxAnnualQuantityKg: 100, permitType: 'cultivation' },
    ]);
    // estimatedMaxPlants = 100 * 10 = 1000, 90% = 900
    prisma.plant.count.mockResolvedValue(910);
    const evaluator = new ProductionLimitEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(true); // Not blocked yet
    expect(result.severity).toBe('warning');
    expect(result.description).toContain('WARNING');
  });

  it('blocks at 100% utilization', async () => {
    const prisma = createMockPrisma();
    prisma.permit.findMany.mockResolvedValue([
      { id: 'p-1', maxAnnualQuantityKg: 100, permitType: 'cultivation' },
    ]);
    prisma.plant.count.mockResolvedValue(1000); // 1000/1000 = 100%
    const evaluator = new ProductionLimitEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.autoAction?.type).toBe('block_operation');
  });
});

// ──────── Destruction Compliance (R012) ──────────
describe('DestructionComplianceEvaluator (R012)', () => {
  function createMockPrisma() {
    return {
      destructionEvent: { findUnique: vi.fn().mockResolvedValue(null) },
    };
  }

  it('fails when no entityId provided', async () => {
    const evaluator = new DestructionComplianceEvaluator(createMockPrisma() as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(false);
    expect(result.description).toContain('not provided');
  });

  it('fails when destruction event not found', async () => {
    const prisma = createMockPrisma();
    const evaluator = new DestructionComplianceEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'd-1' });
    expect(result.passed).toBe(false);
    expect(result.description).toContain('not found');
  });

  it('passes for fully compliant destruction', async () => {
    const prisma = createMockPrisma();
    prisma.destructionEvent.findUnique.mockResolvedValue({
      id: 'd-1',
      witnessNames: ['Witness A', 'Witness B'],
      photos: ['photo1.jpg', 'photo2.jpg'],
      destructionMethod: 'incineration',
      quantityKg: 50,
      facility: { name: 'Farm A' },
    });
    const evaluator = new DestructionComplianceEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'd-1' });
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('fails for insufficient witnesses (<2)', async () => {
    const prisma = createMockPrisma();
    prisma.destructionEvent.findUnique.mockResolvedValue({
      id: 'd-1',
      witnessNames: ['Witness A'],
      photos: ['photo1.jpg'],
      destructionMethod: 'incineration',
      quantityKg: 50,
      facility: { name: 'Farm A' },
    });
    const evaluator = new DestructionComplianceEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'd-1' });
    expect(result.passed).toBe(false);
    expect(result.details.violations).toEqual(expect.arrayContaining([expect.stringContaining('witness')]));
  });

  it('fails for unapproved destruction method', async () => {
    const prisma = createMockPrisma();
    prisma.destructionEvent.findUnique.mockResolvedValue({
      id: 'd-1',
      witnessNames: ['A', 'B'],
      photos: ['photo1.jpg'],
      destructionMethod: 'open_burning', // Not approved
      quantityKg: 50,
      facility: { name: 'Farm A' },
    });
    const evaluator = new DestructionComplianceEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'd-1' });
    expect(result.passed).toBe(false);
    expect(result.details.violations).toEqual(expect.arrayContaining([expect.stringContaining('not approved')]));
  });

  it('fails for missing photos', async () => {
    const prisma = createMockPrisma();
    prisma.destructionEvent.findUnique.mockResolvedValue({
      id: 'd-1',
      witnessNames: ['A', 'B'],
      photos: [],
      destructionMethod: 'composting',
      quantityKg: 50,
      facility: { name: 'Farm A' },
    });
    const evaluator = new DestructionComplianceEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'd-1' });
    expect(result.passed).toBe(false);
    expect(result.details.violations).toEqual(expect.arrayContaining([expect.stringContaining('No photos')]));
  });

  it('blocks operation on violation', async () => {
    const prisma = createMockPrisma();
    prisma.destructionEvent.findUnique.mockResolvedValue({
      id: 'd-1',
      witnessNames: [],
      photos: [],
      destructionMethod: 'unknown',
      quantityKg: 0,
      facility: { name: 'Farm A' },
    });
    const evaluator = new DestructionComplianceEvaluator(prisma as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'd-1' });
    expect(result.passed).toBe(false);
    expect(result.autoAction?.type).toBe('block_operation');
  });

  it('validates all approved methods', async () => {
    const approvedMethods = [
      'incineration',
      'composting',
      'chemical_denaturation',
      'grinding',
      'grinding_and_burial',
    ];
    const prisma = createMockPrisma();
    const evaluator = new DestructionComplianceEvaluator(prisma as any);

    for (const method of approvedMethods) {
      prisma.destructionEvent.findUnique.mockResolvedValue({
        id: 'd-1',
        witnessNames: ['A', 'B'],
        photos: ['photo.jpg'],
        destructionMethod: method,
        quantityKg: 10,
        facility: { name: 'Farm A' },
      });
      const result = await evaluator.evaluate({ tenantId: 'tenant-1', entityId: 'd-1' });
      expect(result.passed).toBe(true);
    }
  });
});

// ──────── Permit Activity Scope (R014) ──────────
describe('PermitActivityScopeEvaluator (R014)', () => {
  function createMockPrisma() {
    return {
      permit: { findMany: vi.fn().mockResolvedValue([]) },
    };
  }

  it('passes when no operation in metadata', async () => {
    const evaluator = new PermitActivityScopeEvaluator(createMockPrisma() as any);
    const result = await evaluator.evaluate({ tenantId: 'tenant-1' });
    expect(result.passed).toBe(true);
  });

  it('passes when operation is authorized', async () => {
    const prisma = createMockPrisma();
    prisma.permit.findMany.mockResolvedValue([
      { id: 'p-1', authorizedActivities: ['cultivation', 'processing'], permitType: 'full' },
    ]);
    const evaluator = new PermitActivityScopeEvaluator(prisma as any);
    const result = await evaluator.evaluate({
      tenantId: 'tenant-1',
      metadata: { operation: 'plant.create' }, // maps to 'cultivation'
    });
    expect(result.passed).toBe(true);
  });

  it('blocks when no active permits exist', async () => {
    const prisma = createMockPrisma();
    prisma.permit.findMany.mockResolvedValue([]); // No permits
    const evaluator = new PermitActivityScopeEvaluator(prisma as any);
    const result = await evaluator.evaluate({
      tenantId: 'tenant-1',
      metadata: { operation: 'plant.create' },
    });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.autoAction?.type).toBe('block_operation');
  });

  it('blocks unauthorized activity', async () => {
    const prisma = createMockPrisma();
    prisma.permit.findMany.mockResolvedValue([
      { id: 'p-1', authorizedActivities: ['cultivation'], permitType: 'grow' },
    ]);
    const evaluator = new PermitActivityScopeEvaluator(prisma as any);
    const result = await evaluator.evaluate({
      tenantId: 'tenant-1',
      metadata: { operation: 'sale.create' }, // maps to 'distribution', not authorized
    });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.description).toContain('BLOCKED');
    expect(result.autoAction?.type).toBe('block_operation');
  });

  it('maps all known operations correctly', async () => {
    const expectedMappings: Record<string, string> = {
      'plant.create': 'cultivation',
      'plant.update': 'cultivation',
      'harvest.create': 'cultivation',
      'batch.create': 'processing',
      'batch.process': 'processing',
      'sale.create': 'distribution',
      'transfer.create': 'distribution',
      'import.create': 'import',
      'export.create': 'export',
      'research.activity': 'research',
    };

    const prisma = createMockPrisma();
    const evaluator = new PermitActivityScopeEvaluator(prisma as any);

    for (const [operation, activity] of Object.entries(expectedMappings)) {
      prisma.permit.findMany.mockResolvedValue([
        { id: 'p-1', authorizedActivities: [activity], permitType: 'test' },
      ]);
      const result = await evaluator.evaluate({
        tenantId: 'tenant-1',
        metadata: { operation },
      });
      expect(result.passed).toBe(true);
    }
  });
});
