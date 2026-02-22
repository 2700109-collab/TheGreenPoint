import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { UpdateInspectionDto } from '../dto/update-inspection.dto';
import { CompleteInspectionDto } from '../dto/complete-inspection.dto';
import { InspectionFilterDto } from '../dto/inspection-filter.dto';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateInspectionDto', () => {
  const valid = {
    facilityId: UUID,
    type: 'routine',
    scheduledDate: '2025-07-15T09:00:00Z',
  };

  it('accepts valid inspection', async () => {
    await expectValid(CreateInspectionDto, valid);
  });

  it('accepts with optional fields', async () => {
    await expectValid(CreateInspectionDto, {
      ...valid,
      priority: 'high',
      estimatedDurationHrs: 2,
      reason: 'Quarterly audit',
      additionalInspectors: [UUID],
    });
  });

  it('rejects invalid type', async () => {
    await expectInvalid(CreateInspectionDto, { ...valid, type: 'surprise' }, ['type']);
  });

  it('rejects missing facilityId', async () => {
    const { facilityId, ...rest } = valid;
    await expectInvalid(CreateInspectionDto, rest, ['facilityId']);
  });

  it('rejects invalid priority', async () => {
    await expectInvalid(CreateInspectionDto, { ...valid, priority: 'extreme' }, ['priority']);
  });

  it('rejects too-short duration', async () => {
    await expectInvalid(CreateInspectionDto, { ...valid, estimatedDurationHrs: 0.1 }, [
      'estimatedDurationHrs',
    ]);
  });
});

describe('UpdateInspectionDto', () => {
  it('accepts empty (all optional)', async () => {
    await expectValid(UpdateInspectionDto, {});
  });

  it('accepts status update', async () => {
    await expectValid(UpdateInspectionDto, { status: 'in_progress' });
  });

  it('rejects invalid status', async () => {
    await expectInvalid(UpdateInspectionDto, { status: 'done' }, ['status']);
  });
});

describe('CompleteInspectionDto', () => {
  const valid = { overallOutcome: 'pass' };

  it('accepts minimal completion', async () => {
    await expectValid(CompleteInspectionDto, valid);
  });

  it('accepts with checklist', async () => {
    await expectValid(CompleteInspectionDto, {
      ...valid,
      checklist: [
        { item: 'Security fence', status: 'pass' },
        { item: 'Fire extinguisher', status: 'fail', severity: 'medium', notes: 'Expired' },
      ],
      findings: 'One non-compliance found',
      remediationRequired: true,
      remediationDeadline: '2025-08-01',
      remediationNotes: 'Replace fire extinguisher',
    });
  });

  it('rejects invalid outcome', async () => {
    await expectInvalid(CompleteInspectionDto, { overallOutcome: 'maybe' }, ['overallOutcome']);
  });

  it('rejects invalid checklist item status', async () => {
    await expectInvalid(CompleteInspectionDto, {
      overallOutcome: 'pass',
      checklist: [{ item: 'Test', status: 'unknown' }],
    });
  });
});

describe('InspectionFilterDto', () => {
  it('accepts empty filter', async () => {
    await expectValid(InspectionFilterDto, {});
  });

  it('accepts status filter', async () => {
    await expectValid(InspectionFilterDto, { status: 'scheduled' });
  });

  it('rejects invalid status', async () => {
    await expectInvalid(InspectionFilterDto, { status: 'active' }, ['status']);
  });
});
