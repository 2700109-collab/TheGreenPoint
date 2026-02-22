import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateHarvestDto, UpdateHarvestDto, HarvestFilterDto } from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateHarvestDto', () => {
  const valid = {
    plantIds: [UUID],
    facilityId: UUID,
    wetWeightGrams: 500,
  };

  it('accepts valid harvest', async () => {
    await expectValid(CreateHarvestDto, valid);
  });

  it('accepts with optional fields', async () => {
    await expectValid(CreateHarvestDto, {
      ...valid,
      dryWeightGrams: 120,
      notes: 'Harvest batch A',
      harvestDate: '2025-06-15',
    });
  });

  it('rejects empty plantIds', async () => {
    await expectInvalid(CreateHarvestDto, { ...valid, plantIds: [] }, ['plantIds']);
  });

  it('rejects non-UUID in plantIds', async () => {
    await expectInvalid(CreateHarvestDto, { ...valid, plantIds: ['not-uuid'] }, ['plantIds']);
  });

  it('rejects zero wetWeightGrams', async () => {
    await expectInvalid(CreateHarvestDto, { ...valid, wetWeightGrams: 0 }, ['wetWeightGrams']);
  });

  it('rejects missing facilityId', async () => {
    const { facilityId, ...rest } = valid;
    await expectInvalid(CreateHarvestDto, rest, ['facilityId']);
  });
});

describe('UpdateHarvestDto', () => {
  it('accepts empty (all optional)', async () => {
    await expectValid(UpdateHarvestDto, {});
  });

  it('accepts dryWeightGrams', async () => {
    await expectValid(UpdateHarvestDto, { dryWeightGrams: 100 });
  });

  it('rejects negative dryWeightGrams', async () => {
    await expectInvalid(UpdateHarvestDto, { dryWeightGrams: -5 }, ['dryWeightGrams']);
  });
});

describe('HarvestFilterDto', () => {
  it('accepts empty filter', async () => {
    await expectValid(HarvestFilterDto, {});
  });

  it('accepts facilityId filter', async () => {
    await expectValid(HarvestFilterDto, { facilityId: UUID });
  });

  it('accepts date range', async () => {
    await expectValid(HarvestFilterDto, {
      harvestedAfter: '2025-01-01',
      harvestedBefore: '2025-12-31',
    });
  });

  it('rejects non-UUID facilityId', async () => {
    await expectInvalid(HarvestFilterDto, { facilityId: 'bad' }, ['facilityId']);
  });
});
