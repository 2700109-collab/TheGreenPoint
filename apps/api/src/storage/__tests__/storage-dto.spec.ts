import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { PresignedUploadDto, PresignedDownloadDto } from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('PresignedUploadDto', () => {
  const valid = {
    tenantId: UUID,
    entityType: 'inspections',
    entityId: UUID,
    filename: 'photo-001.jpg',
    contentType: 'image/jpeg',
  };

  it('accepts valid upload request', async () => {
    await expectValid(PresignedUploadDto, valid);
  });

  it('accepts all entity types', async () => {
    for (const entityType of ['inspections', 'destruction-events', 'lab-results', 'transfers', 'reports']) {
      await expectValid(PresignedUploadDto, { ...valid, entityType });
    }
  });

  it('rejects invalid entityType', async () => {
    await expectInvalid(PresignedUploadDto, { ...valid, entityType: 'plants' }, ['entityType']);
  });

  it('rejects invalid content type format', async () => {
    await expectInvalid(PresignedUploadDto, { ...valid, contentType: 'not-mime' }, ['contentType']);
  });

  it('accepts complex MIME types', async () => {
    await expectValid(PresignedUploadDto, { ...valid, contentType: 'application/vnd.ms-excel' });
  });

  it('rejects empty filename', async () => {
    await expectInvalid(PresignedUploadDto, { ...valid, filename: '' }, ['filename']);
  });

  it('rejects non-UUID tenantId', async () => {
    await expectInvalid(PresignedUploadDto, { ...valid, tenantId: 'bad' }, ['tenantId']);
  });
});

describe('PresignedDownloadDto', () => {
  it('accepts valid file key', async () => {
    await expectValid(PresignedDownloadDto, { fileKey: 'tenant/inspections/uuid/photo.jpg' });
  });

  it('rejects empty fileKey', async () => {
    await expectInvalid(PresignedDownloadDto, { fileKey: '' }, ['fileKey']);
  });

  it('rejects missing fileKey', async () => {
    await expectInvalid(PresignedDownloadDto, {}, ['fileKey']);
  });
});
