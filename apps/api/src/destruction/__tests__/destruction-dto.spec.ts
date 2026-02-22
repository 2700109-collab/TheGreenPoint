import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateDestructionDto } from '../dto/create-destruction.dto';
import { ApproveDestructionDto } from '../dto/approve-destruction.dto';
import { DestructionFilterDto } from '../dto/destruction-filter.dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateDestructionDto', () => {
  const valid = {
    facilityId: UUID,
    entityType: 'plant',
    entityIds: [UUID],
    quantityKg: 5.0,
    destructionMethod: 'incineration',
    destructionDate: '2025-07-15',
    witnessNames: ['Inspector A', 'Operator B'],
    witnessOrganizations: ['SAHPRA', 'GreenPoint'],
    witnessSignatures: ['sig-a', 'sig-b'],
    reason: 'failed_lab',
  };

  it('accepts valid destruction event', async () => {
    await expectValid(CreateDestructionDto, valid);
  });

  it('accepts with optional photos', async () => {
    await expectValid(CreateDestructionDto, {
      ...valid,
      photos: ['photo1.jpg', 'photo2.jpg'],
      videoUrl: 'https://storage.co.za/video.mp4',
    });
  });

  it('rejects invalid entityType', async () => {
    await expectInvalid(CreateDestructionDto, { ...valid, entityType: 'unknown' }, ['entityType']);
  });

  it('rejects invalid destructionMethod', async () => {
    await expectInvalid(CreateDestructionDto, { ...valid, destructionMethod: 'burning' }, [
      'destructionMethod',
    ]);
  });

  it('rejects zero quantity', async () => {
    await expectInvalid(CreateDestructionDto, { ...valid, quantityKg: 0 }, ['quantityKg']);
  });

  it('rejects less than 2 witnesses', async () => {
    await expectInvalid(
      CreateDestructionDto,
      { ...valid, witnessNames: ['Only One'] },
      ['witnessNames'],
    );
  });

  it('rejects empty entityIds', async () => {
    await expectInvalid(CreateDestructionDto, { ...valid, entityIds: [] }, ['entityIds']);
  });

  it('rejects invalid reason', async () => {
    await expectInvalid(CreateDestructionDto, { ...valid, reason: 'fun' }, ['reason']);
  });
});

describe('ApproveDestructionDto', () => {
  it('accepts with optional notes', async () => {
    await expectValid(ApproveDestructionDto, { notes: 'Approved by regulator' });
  });

  it('accepts empty (all optional)', async () => {
    await expectValid(ApproveDestructionDto, {});
  });
});

describe('DestructionFilterDto', () => {
  it('accepts empty filter', async () => {
    await expectValid(DestructionFilterDto, {});
  });

  it('accepts entityType filter', async () => {
    await expectValid(DestructionFilterDto, { entityType: 'batch' });
  });

  it('rejects invalid entityType', async () => {
    await expectInvalid(DestructionFilterDto, { entityType: 'unknown' }, ['entityType']);
  });
});
