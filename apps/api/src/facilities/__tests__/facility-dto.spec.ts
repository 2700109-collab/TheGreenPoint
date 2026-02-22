import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateFacilityDto, UpdateFacilityDto, CreateZoneDto } from '../dto';

describe('CreateFacilityDto', () => {
  const valid = {
    name: 'GreenPoint Cape Town',
    facilityType: 'cultivation',
    province: 'Western Cape',
    address: '123 Cannabis Lane, Cape Town',
    latitude: -33.9,
    longitude: 18.4,
  };

  it('accepts valid facility', async () => {
    await expectValid(CreateFacilityDto, valid);
  });

  it('accepts with optional boundary', async () => {
    await expectValid(CreateFacilityDto, {
      ...valid,
      boundary: { type: 'Polygon', coordinates: [[[18.4, -33.9]]] },
    });
  });

  it('rejects invalid facilityType', async () => {
    await expectInvalid(CreateFacilityDto, { ...valid, facilityType: 'illegal' }, ['facilityType']);
  });

  // ── SA coordinate bounds ──
  it('rejects latitude north of SA (> -22)', async () => {
    await expectInvalid(CreateFacilityDto, { ...valid, latitude: -10 }, ['latitude']);
  });

  it('rejects latitude south of SA (< -35)', async () => {
    await expectInvalid(CreateFacilityDto, { ...valid, latitude: -40 }, ['latitude']);
  });

  it('rejects longitude west of SA (< 16)', async () => {
    await expectInvalid(CreateFacilityDto, { ...valid, longitude: 10 }, ['longitude']);
  });

  it('rejects longitude east of SA (> 33)', async () => {
    await expectInvalid(CreateFacilityDto, { ...valid, longitude: 40 }, ['longitude']);
  });

  it('rejects missing name', async () => {
    const { name, ...rest } = valid;
    await expectInvalid(CreateFacilityDto, rest, ['name']);
  });

  it('rejects missing address', async () => {
    const { address, ...rest } = valid;
    await expectInvalid(CreateFacilityDto, rest, ['address']);
  });
});

describe('UpdateFacilityDto', () => {
  it('accepts empty (all optional)', async () => {
    await expectValid(UpdateFacilityDto, {});
  });

  it('accepts name only', async () => {
    await expectValid(UpdateFacilityDto, { name: 'Updated Name' });
  });

  it('rejects invalid latitude', async () => {
    await expectInvalid(UpdateFacilityDto, { latitude: -50 }, ['latitude']);
  });
});

describe('CreateZoneDto', () => {
  const valid = { name: 'Greenhouse A', zoneType: 'indoor', capacity: 500 };

  it('accepts valid zone', async () => {
    await expectValid(CreateZoneDto, valid);
  });

  it('rejects zero capacity', async () => {
    await expectInvalid(CreateZoneDto, { ...valid, capacity: 0 }, ['capacity']);
  });

  it('rejects missing name', async () => {
    const { name, ...rest } = valid;
    await expectInvalid(CreateZoneDto, rest, ['name']);
  });
});
