import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateBatchDto, UpdateBatchDto } from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateBatchDto', () => {
  const valid = {
    parentBatchId: UUID,
    batchType: 'processed',
    facilityId: UUID,
    processedWeightGrams: 500,
  };

  it('accepts valid batch', async () => {
    await expectValid(CreateBatchDto, valid);
  });

  it('accepts with optional notes', async () => {
    await expectValid(CreateBatchDto, { ...valid, notes: 'Extraction run 1' });
  });

  it('rejects invalid batchType', async () => {
    await expectInvalid(CreateBatchDto, { ...valid, batchType: 'invalid' }, ['batchType']);
  });

  it('rejects zero weight', async () => {
    await expectInvalid(CreateBatchDto, { ...valid, processedWeightGrams: 0 }, [
      'processedWeightGrams',
    ]);
  });

  it('rejects negative weight', async () => {
    await expectInvalid(CreateBatchDto, { ...valid, processedWeightGrams: -5 }, [
      'processedWeightGrams',
    ]);
  });

  it('rejects non-UUID parentBatchId', async () => {
    await expectInvalid(CreateBatchDto, { ...valid, parentBatchId: 'xyz' }, ['parentBatchId']);
  });

  it('rejects missing facilityId', async () => {
    const { facilityId, ...rest } = valid;
    await expectInvalid(CreateBatchDto, rest, ['facilityId']);
  });
});

describe('UpdateBatchDto', () => {
  it('accepts empty (all optional)', async () => {
    await expectValid(UpdateBatchDto, {});
  });

  it('accepts updated weight', async () => {
    await expectValid(UpdateBatchDto, { processedWeightGrams: 250 });
  });

  it('accepts updated dry weight', async () => {
    await expectValid(UpdateBatchDto, { dryWeightGrams: 100 });
  });

  it('rejects negative weight', async () => {
    await expectInvalid(UpdateBatchDto, { processedWeightGrams: -1 }, ['processedWeightGrams']);
  });
});
