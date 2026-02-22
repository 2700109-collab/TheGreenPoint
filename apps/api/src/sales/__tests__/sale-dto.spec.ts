import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateSaleDto, SaleFilterDto, SalesSummaryQueryDto } from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateSaleDto', () => {
  const valid = {
    batchId: UUID,
    facilityId: UUID,
    quantityGrams: 28,
    priceZar: 350,
  };

  it('accepts valid sale', async () => {
    await expectValid(CreateSaleDto, valid);
  });

  it('accepts with optional fields', async () => {
    await expectValid(CreateSaleDto, {
      ...valid,
      saleType: 'retail',
      customerReference: 'CUST-001',
      saleDate: '2025-07-01',
      customerVerified: true,
    });
  });

  it('rejects zero quantity', async () => {
    await expectInvalid(CreateSaleDto, { ...valid, quantityGrams: 0 }, ['quantityGrams']);
  });

  it('rejects negative price', async () => {
    await expectInvalid(CreateSaleDto, { ...valid, priceZar: -10 }, ['priceZar']);
  });

  it('rejects invalid saleType', async () => {
    await expectInvalid(CreateSaleDto, { ...valid, saleType: 'black_market' }, ['saleType']);
  });

  it('rejects non-UUID batchId', async () => {
    await expectInvalid(CreateSaleDto, { ...valid, batchId: 'bad' }, ['batchId']);
  });
});

describe('SaleFilterDto', () => {
  it('accepts empty filter', async () => {
    await expectValid(SaleFilterDto, {});
  });

  it('accepts with facilityId', async () => {
    await expectValid(SaleFilterDto, { facilityId: UUID });
  });

  it('accepts date range', async () => {
    await expectValid(SaleFilterDto, { dateFrom: '2025-01-01', dateTo: '2025-12-31' });
  });

  it('rejects non-UUID facilityId', async () => {
    await expectInvalid(SaleFilterDto, { facilityId: 'bad' }, ['facilityId']);
  });
});

describe('SalesSummaryQueryDto', () => {
  it('accepts valid YYYY-MM period', async () => {
    await expectValid(SalesSummaryQueryDto, { period: '2025-07' });
  });

  it('accepts with optional facilityId', async () => {
    await expectValid(SalesSummaryQueryDto, { period: '2025-07', facilityId: UUID });
  });

  it('rejects invalid period format (YYYY/MM)', async () => {
    await expectInvalid(SalesSummaryQueryDto, { period: '2025/07' }, ['period']);
  });

  it('rejects period with day', async () => {
    await expectInvalid(SalesSummaryQueryDto, { period: '2025-07-01' }, ['period']);
  });

  it('rejects missing period', async () => {
    await expectInvalid(SalesSummaryQueryDto, {}, ['period']);
  });
});
