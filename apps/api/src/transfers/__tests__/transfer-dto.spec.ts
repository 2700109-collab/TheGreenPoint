import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import {
  TransferItemDto,
  CreateTransferDto,
  ReceivedItemDto,
  AcceptTransferDto,
  RejectTransferDto,
} from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '660e8400-e29b-41d4-a716-446655440000';

// ── TransferItemDto ─────────────────────────────────────────
describe('TransferItemDto', () => {
  it('accepts valid item', async () => {
    await expectValid(TransferItemDto, { batchId: UUID, quantityGrams: 100 });
  });

  it('rejects zero quantity', async () => {
    await expectInvalid(TransferItemDto, { batchId: UUID, quantityGrams: 0 }, ['quantityGrams']);
  });

  it('rejects non-UUID batchId', async () => {
    await expectInvalid(TransferItemDto, { batchId: 'bad', quantityGrams: 100 }, ['batchId']);
  });
});

// ── CreateTransferDto ───────────────────────────────────────
describe('CreateTransferDto', () => {
  const valid = {
    senderFacilityId: UUID,
    receiverTenantId: UUID2,
    receiverFacilityId: UUID2,
    items: [{ batchId: UUID, quantityGrams: 500 }],
  };

  it('accepts valid transfer', async () => {
    await expectValid(CreateTransferDto, valid);
  });

  it('accepts with optional fields', async () => {
    await expectValid(CreateTransferDto, {
      ...valid,
      vehicleRegistration: 'CA 123 456',
      driverName: 'Jan van der Merwe',
      driverIdNumber: '8501015009088',
      estimatedArrival: '2025-07-01T10:00:00Z',
      notes: 'Handle with care',
    });
  });

  it('rejects empty items array', async () => {
    await expectInvalid(CreateTransferDto, { ...valid, items: [] }, ['items']);
  });

  it('rejects missing senderFacilityId', async () => {
    const { senderFacilityId, ...rest } = valid;
    await expectInvalid(CreateTransferDto, rest, ['senderFacilityId']);
  });

  it('rejects non-UUID receiverTenantId', async () => {
    await expectInvalid(CreateTransferDto, { ...valid, receiverTenantId: 'bad' }, [
      'receiverTenantId',
    ]);
  });
});

// ── ReceivedItemDto ─────────────────────────────────────────
describe('ReceivedItemDto', () => {
  it('accepts valid received item', async () => {
    await expectValid(ReceivedItemDto, { transferItemId: UUID, receivedQuantityGrams: 490 });
  });

  it('accepts zero received (total loss)', async () => {
    await expectValid(ReceivedItemDto, { transferItemId: UUID, receivedQuantityGrams: 0 });
  });

  it('rejects non-UUID transferItemId', async () => {
    await expectInvalid(ReceivedItemDto, { transferItemId: 'bad', receivedQuantityGrams: 100 }, [
      'transferItemId',
    ]);
  });
});

// ── AcceptTransferDto ───────────────────────────────────────
describe('AcceptTransferDto', () => {
  const validItem = { transferItemId: UUID, receivedQuantityGrams: 500 };

  it('accepts valid acceptance', async () => {
    await expectValid(AcceptTransferDto, { receivedItems: [validItem] });
  });

  it('accepts with notes', async () => {
    await expectValid(AcceptTransferDto, { receivedItems: [validItem], notes: 'All good' });
  });
});

// ── RejectTransferDto ───────────────────────────────────────
describe('RejectTransferDto', () => {
  it('accepts with reason', async () => {
    await expectValid(RejectTransferDto, { reason: 'Incorrect quantities' });
  });

  it('rejects missing reason', async () => {
    await expectInvalid(RejectTransferDto, {}, ['reason']);
  });
});
