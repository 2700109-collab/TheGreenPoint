import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import {
  CreatePlantingIntentionDto,
  UpdatePlantingIntentionDto,
  PlantingIntentionFilterDto,
} from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreatePlantingIntentionDto', () => {
  const valid = {
    facilityId: UUID,
    season: '2025/2026',
    cultivars: [{ strainId: UUID, areaHectares: 2.5, estimatedYieldKg: 500 }],
    totalAreaHa: 2.5,
    totalEstYieldKg: 500,
    plantingStart: '2025-09-01',
    plantingEnd: '2025-11-30',
  };

  it('accepts valid planting intention', async () => {
    await expectValid(CreatePlantingIntentionDto, valid);
  });

  it('rejects missing facilityId', async () => {
    const { facilityId, ...rest } = valid;
    await expectInvalid(CreatePlantingIntentionDto, rest, ['facilityId']);
  });

  it('rejects zero total area', async () => {
    await expectInvalid(CreatePlantingIntentionDto, { ...valid, totalAreaHa: 0 }, ['totalAreaHa']);
  });

  it('rejects missing cultivars', async () => {
    const { cultivars, ...rest } = valid;
    await expectInvalid(CreatePlantingIntentionDto, rest, ['cultivars']);
  });
});

describe('UpdatePlantingIntentionDto', () => {
  it('accepts empty (all optional)', async () => {
    await expectValid(UpdatePlantingIntentionDto, {});
  });

  it('accepts partial update', async () => {
    await expectValid(UpdatePlantingIntentionDto, { season: '2026/2027' });
  });
});

describe('PlantingIntentionFilterDto', () => {
  it('accepts empty filter', async () => {
    await expectValid(PlantingIntentionFilterDto, {});
  });

  it('accepts season filter', async () => {
    await expectValid(PlantingIntentionFilterDto, { season: '2025/2026' });
  });

  it('accepts status filter', async () => {
    await expectValid(PlantingIntentionFilterDto, { status: 'submitted' });
  });
});
