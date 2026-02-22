import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InspectionsService } from '../../src/inspections/inspections.service';
import { createMockPrisma, createMockAuditService, resetUuidCounter } from '@test/helpers/integration-helpers';

function buildInspectionsService() {
  const prisma = createMockPrisma();
  const audit = createMockAuditService();
  const notifications = { send: vi.fn().mockResolvedValue(undefined) };
  const reportGenerator = { generate: vi.fn().mockResolvedValue(undefined) };
  const eventEmitter = { emit: vi.fn() };

  const svc = new InspectionsService(
    prisma,
    audit as any,
    notifications as any,
    reportGenerator as any,
    eventEmitter as any,
  );

  return { svc, prisma, audit, notifications, eventEmitter };
}

const INSPECTOR = 'inspector-1';
const TENANT = 'tenant-greenfields';

function mockInspection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'insp-1',
    tenantId: TENANT,
    facilityId: 'fac-1',
    inspectorId: INSPECTOR,
    type: 'routine',
    priority: 'medium',
    status: 'scheduled',
    scheduledDate: new Date('2025-03-01'),
    actualStartDate: null,
    completedDate: null,
    estimatedDurationHrs: 4,
    reason: null,
    additionalInspectors: [],
    followUpInspectionId: null,
    checklist: null,
    findings: null,
    overallOutcome: null,
    remediationRequired: false,
    remediationDeadline: null,
    remediationNotes: null,
    photos: [],
    facility: { name: 'Greenfields Farm' },
    ...overrides,
  };
}

describe('Inspection Lifecycle (Integration)', () => {
  beforeEach(() => resetUuidCounter());

  describe('schedule → start → complete flow', () => {
    it('schedules an inspection', async () => {
      const { svc, prisma, audit, notifications, eventEmitter } = buildInspectionsService();

      (prisma.facility.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fac-1',
        name: 'Greenfields Farm',
        tenantId: TENANT,
      });
      (prisma.inspection.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockInspection());

      const result = await svc.schedule(
        {
          facilityId: 'fac-1',
          type: 'routine',
          scheduledDate: '2025-03-01',
        } as any,
        INSPECTOR,
        'regulator',
      );

      expect(result.status).toBe('scheduled');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'inspection.scheduled' }),
      );
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'inspection_scheduled' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('inspection.scheduled', expect.any(Object));
    });

    it('starts a scheduled inspection', async () => {
      const { svc, prisma, audit, eventEmitter } = buildInspectionsService();

      (prisma.inspection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInspection({ status: 'scheduled' }),
      );
      (prisma.inspection.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInspection({ status: 'in_progress', actualStartDate: new Date() }),
      );

      const result = await svc.start('insp-1', INSPECTOR, 'regulator');

      expect(result.status).toBe('in_progress');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'inspection.started' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('inspection.started', expect.any(Object));
    });

    it('rejects starting a completed inspection', async () => {
      const { svc, prisma } = buildInspectionsService();

      (prisma.inspection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInspection({ status: 'completed' }),
      );

      await expect(svc.start('insp-1', INSPECTOR, 'regulator')).rejects.toThrow(
        "Cannot start inspection in status 'completed'",
      );
    });

    it('rejects starting by an unauthorized inspector', async () => {
      const { svc, prisma } = buildInspectionsService();

      (prisma.inspection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInspection({ inspectorId: 'other-inspector', additionalInspectors: [] }),
      );

      await expect(svc.start('insp-1', INSPECTOR, 'regulator')).rejects.toThrow(
        'Only the assigned inspector',
      );
    });

    it('completes an in-progress inspection with outcome', async () => {
      const { svc, prisma, audit } = buildInspectionsService();

      (prisma.inspection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInspection({
          status: 'in_progress',
          facility: { name: 'Greenfields Farm', tenantId: TENANT },
        }),
      );
      (prisma.inspection.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInspection({
          status: 'completed',
          overallOutcome: 'pass',
          completedDate: new Date(),
        }),
      );

      const result = await svc.complete(
        'insp-1',
        {
          overallOutcome: 'pass',
          checklist: [
            { item: 'Security fencing', status: 'pass' },
            { item: 'License displayed', status: 'pass' },
          ],
          findings: 'All in order.',
        } as any,
        INSPECTOR,
        'regulator',
      );

      expect(result.status).toBe('completed');
      expect(result.overallOutcome).toBe('pass');
    });

    it('rejects completing an inspection not in_progress', async () => {
      const { svc, prisma } = buildInspectionsService();

      (prisma.inspection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInspection({ status: 'scheduled' }),
      );

      await expect(
        svc.complete('insp-1', { overallOutcome: 'pass' } as any, INSPECTOR, 'regulator'),
      ).rejects.toThrow("Cannot complete inspection in status 'scheduled'");
    });
  });
});
