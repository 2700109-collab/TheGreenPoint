import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { RecordConsentDto, DataDeletionRequestDto } from '../dto';

describe('RecordConsentDto', () => {
  it('accepts valid consent', async () => {
    await expectValid(RecordConsentDto, {
      consentType: 'data_processing',
      granted: true,
      policyVersion: '1.0',
    });
  });

  it('accepts consent denial', async () => {
    await expectValid(RecordConsentDto, {
      consentType: 'marketing',
      granted: false,
      policyVersion: '1.0',
    });
  });

  it('rejects invalid consentType', async () => {
    await expectInvalid(
      RecordConsentDto,
      { consentType: 'cookies', granted: true, policyVersion: '1.0' },
      ['consentType'],
    );
  });

  it('rejects missing granted', async () => {
    await expectInvalid(
      RecordConsentDto,
      { consentType: 'data_processing', policyVersion: '1.0' },
      ['granted'],
    );
  });

  it('rejects missing policyVersion', async () => {
    await expectInvalid(
      RecordConsentDto,
      { consentType: 'data_processing', granted: true },
      ['policyVersion'],
    );
  });
});

describe('DataDeletionRequestDto', () => {
  it('accepts full deletion', async () => {
    await expectValid(DataDeletionRequestDto, { scope: 'full' });
  });

  it('accepts partial deletion', async () => {
    await expectValid(DataDeletionRequestDto, {
      scope: 'marketing_only',
      reason: 'No longer want marketing emails',
    });
  });

  it('rejects invalid scope', async () => {
    await expectInvalid(DataDeletionRequestDto, { scope: 'everything' }, ['scope']);
  });

  it('rejects missing scope', async () => {
    await expectInvalid(DataDeletionRequestDto, {}, ['scope']);
  });
});
