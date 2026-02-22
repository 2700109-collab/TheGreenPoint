import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { SubmitLabResultDto } from '../dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('SubmitLabResultDto', () => {
  const valid = {
    batchId: UUID,
    labName: 'GreenLab SA',
    labAccreditationNumber: 'T0538',
    labReportNumber: 'RPT-2025-001',
    thcPercent: 0.15,
    cbdPercent: 12.5,
    moisturePercent: 8.2,
    totalCannabinoidsPercent: 14.0,
    pesticidesPass: true,
    heavyMetalsPass: true,
    microbialsPass: true,
    mycotoxinsPass: true,
  };

  it('accepts valid lab result', async () => {
    await expectValid(SubmitLabResultDto, valid);
  });

  it('accepts with optional cannabinoids', async () => {
    await expectValid(SubmitLabResultDto, {
      ...valid,
      cbgPercent: 0.3,
      cbnPercent: 0.1,
    });
  });

  it('accepts with optional certificate URL', async () => {
    await expectValid(SubmitLabResultDto, {
      ...valid,
      certificateUrl: 'https://lab.co.za/cert/123',
    });
  });

  // ── SANAS accreditation regex ──
  it('rejects invalid accreditation number (no T prefix)', async () => {
    await expectInvalid(SubmitLabResultDto, { ...valid, labAccreditationNumber: '0538' }, [
      'labAccreditationNumber',
    ]);
  });

  it('rejects accreditation too short', async () => {
    await expectInvalid(SubmitLabResultDto, { ...valid, labAccreditationNumber: 'T53' }, [
      'labAccreditationNumber',
    ]);
  });

  it('rejects accreditation too long', async () => {
    await expectInvalid(SubmitLabResultDto, { ...valid, labAccreditationNumber: 'T05381' }, [
      'labAccreditationNumber',
    ]);
  });

  it('accepts edge-case accreditation T0000', async () => {
    await expectValid(SubmitLabResultDto, { ...valid, labAccreditationNumber: 'T0000' });
  });

  // ── THC bounds ──
  it('rejects THC below 0', async () => {
    await expectInvalid(SubmitLabResultDto, { ...valid, thcPercent: -1 }, ['thcPercent']);
  });

  it('rejects THC above 100', async () => {
    await expectInvalid(SubmitLabResultDto, { ...valid, thcPercent: 101 }, ['thcPercent']);
  });

  // ── Missing required booleans ──
  it('rejects missing pesticidesPass', async () => {
    const { pesticidesPass, ...rest } = valid;
    await expectInvalid(SubmitLabResultDto, rest, ['pesticidesPass']);
  });

  it('rejects missing heavyMetalsPass', async () => {
    const { heavyMetalsPass, ...rest } = valid;
    await expectInvalid(SubmitLabResultDto, rest, ['heavyMetalsPass']);
  });

  // ── Non-UUID batchId ──
  it('rejects non-UUID batchId', async () => {
    await expectInvalid(SubmitLabResultDto, { ...valid, batchId: 'xyz' }, ['batchId']);
  });
});
