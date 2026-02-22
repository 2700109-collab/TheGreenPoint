import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreatePlantDto, BatchCreatePlantsDto, UpdatePlantStateDto, PlantFilterDto } from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

// ── CreatePlantDto ──────────────────────────────────────────
describe('CreatePlantDto', () => {
  const valid = { strainId: UUID, facilityId: UUID, zoneId: UUID };

  it('accepts valid plant', async () => {
    await expectValid(CreatePlantDto, valid);
  });

  it('accepts with optional fields', async () => {
    await expectValid(CreatePlantDto, {
      ...valid,
      motherPlantId: UUID,
      plantedDate: '2025-06-01',
    });
  });

  it('rejects missing strainId', async () => {
    const { strainId, ...rest } = valid;
    await expectInvalid(CreatePlantDto, rest, ['strainId']);
  });

  it('rejects missing facilityId', async () => {
    const { facilityId, ...rest } = valid;
    await expectInvalid(CreatePlantDto, rest, ['facilityId']);
  });

  it('rejects missing zoneId', async () => {
    const { zoneId, ...rest } = valid;
    await expectInvalid(CreatePlantDto, rest, ['zoneId']);
  });

  it('rejects non-UUID strainId', async () => {
    await expectInvalid(CreatePlantDto, { ...valid, strainId: 'bad' }, ['strainId']);
  });

  it('rejects non-UUID motherPlantId', async () => {
    await expectInvalid(CreatePlantDto, { ...valid, motherPlantId: 'xyz' }, ['motherPlantId']);
  });
});

// ── BatchCreatePlantsDto ────────────────────────────────────
describe('BatchCreatePlantsDto', () => {
  const validPlant = { strainId: UUID, facilityId: UUID, zoneId: UUID };

  it('accepts array of 1 plant', async () => {
    await expectValid(BatchCreatePlantsDto, { plants: [validPlant] });
  });

  it('rejects empty array', async () => {
    await expectInvalid(BatchCreatePlantsDto, { plants: [] }, ['plants']);
  });

  it('rejects missing plants field', async () => {
    await expectInvalid(BatchCreatePlantsDto, {}, ['plants']);
  });
});

// ── UpdatePlantStateDto ─────────────────────────────────────
describe('UpdatePlantStateDto', () => {
  it('accepts valid state transition', async () => {
    await expectValid(UpdatePlantStateDto, { state: 'seedling' });
  });

  it('accepts with reason', async () => {
    await expectValid(UpdatePlantStateDto, { state: 'destroyed', reason: 'Failed lab test' });
  });

  it('rejects invalid state', async () => {
    await expectInvalid(UpdatePlantStateDto, { state: 'invalid_state' }, ['state']);
  });

  it('rejects missing state', async () => {
    await expectInvalid(UpdatePlantStateDto, {}, ['state']);
  });
});

// ── PlantFilterDto ──────────────────────────────────────────
describe('PlantFilterDto', () => {
  it('accepts empty filter (all optional)', async () => {
    await expectValid(PlantFilterDto, {});
  });

  it('accepts with state filter', async () => {
    await expectValid(PlantFilterDto, { state: 'vegetative' });
  });

  it('accepts with facilityId filter', async () => {
    await expectValid(PlantFilterDto, { facilityId: UUID });
  });

  it('accepts with date range', async () => {
    await expectValid(PlantFilterDto, {
      plantedAfter: '2025-01-01',
      plantedBefore: '2025-12-31',
    });
  });

  it('rejects invalid state enum', async () => {
    await expectInvalid(PlantFilterDto, { state: 'nonexistent' }, ['state']);
  });

  it('rejects non-UUID facilityId', async () => {
    await expectInvalid(PlantFilterDto, { facilityId: 'bad' }, ['facilityId']);
  });
});
