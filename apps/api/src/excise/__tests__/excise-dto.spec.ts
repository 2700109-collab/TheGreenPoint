import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateExciseRateDto, ExciseLedgerFilterDto } from '../dto';

describe('CreateExciseRateDto', () => {
  const valid = {
    productCategory: 'dried_flower',
    ratePerUnit: 3.5,
    unit: 'gram',
    effectiveDate: '2025-01-01',
  };

  it('accepts valid excise rate', async () => {
    await expectValid(CreateExciseRateDto, valid);
  });

  it('accepts with optional expiry', async () => {
    await expectValid(CreateExciseRateDto, {
      ...valid,
      expiryDate: '2025-12-31',
      isActive: true,
    });
  });

  it('rejects invalid productCategory', async () => {
    await expectInvalid(CreateExciseRateDto, { ...valid, productCategory: 'weed' }, [
      'productCategory',
    ]);
  });

  it('rejects invalid unit', async () => {
    await expectInvalid(CreateExciseRateDto, { ...valid, unit: 'kg' }, ['unit']);
  });

  it('rejects negative rate', async () => {
    await expectInvalid(CreateExciseRateDto, { ...valid, ratePerUnit: -1 }, ['ratePerUnit']);
  });
});

describe('ExciseLedgerFilterDto', () => {
  it('accepts empty filter', async () => {
    await expectValid(ExciseLedgerFilterDto, {});
  });

  it('accepts period filter', async () => {
    await expectValid(ExciseLedgerFilterDto, { period: '2025-Q1' });
  });

  it('accepts category filter', async () => {
    await expectValid(ExciseLedgerFilterDto, { productCategory: 'extract' });
  });
});
