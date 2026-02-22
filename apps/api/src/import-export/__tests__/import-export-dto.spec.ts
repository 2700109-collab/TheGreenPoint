import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateImportExportDto } from '../dto/create-import-export.dto';
import { UpdateImportExportStatusDto } from '../dto/update-import-export-status.dto';
import { ImportExportFilterDto } from '../dto/import-export-filter.dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateImportExportDto', () => {
  const valid = {
    type: 'export',
    countryCode: 'DE',
    partnerCompany: 'EuroCannaGmbH',
    batchId: UUID,
    quantityKg: 10.5,
    productCategory: 'dried_flower',
    permitId: UUID,
  };

  it('accepts valid import/export record', async () => {
    await expectValid(CreateImportExportDto, valid);
  });

  it('accepts with optional fields', async () => {
    await expectValid(CreateImportExportDto, {
      ...valid,
      customsDeclarationNumber: 'SA-2025-EXP-001',
      shippingDate: '2025-07-15',
      arrivalDate: '2025-07-25',
    });
  });

  it('rejects invalid type', async () => {
    await expectInvalid(CreateImportExportDto, { ...valid, type: 'smuggle' }, ['type']);
  });

  it('rejects invalid productCategory', async () => {
    await expectInvalid(CreateImportExportDto, { ...valid, productCategory: 'joints' }, [
      'productCategory',
    ]);
  });

  it('rejects tiny quantity', async () => {
    await expectInvalid(CreateImportExportDto, { ...valid, quantityKg: 0 }, ['quantityKg']);
  });

  it('rejects non-UUID permitId', async () => {
    await expectInvalid(CreateImportExportDto, { ...valid, permitId: 'bad' }, ['permitId']);
  });
});

describe('UpdateImportExportStatusDto', () => {
  it('accepts valid status update', async () => {
    await expectValid(UpdateImportExportStatusDto, { status: 'in_transit' });
  });

  it('rejects invalid status', async () => {
    await expectInvalid(UpdateImportExportStatusDto, { status: 'lost' }, ['status']);
  });
});

describe('ImportExportFilterDto', () => {
  it('accepts empty filter', async () => {
    await expectValid(ImportExportFilterDto, {});
  });

  it('accepts type filter', async () => {
    await expectValid(ImportExportFilterDto, { type: 'import' });
  });

  it('rejects invalid type', async () => {
    await expectInvalid(ImportExportFilterDto, { type: 'smuggle' }, ['type']);
  });
});
