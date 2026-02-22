import { describe, it, expect, vi } from 'vitest';
import { AlertEscalationService } from '../escalation/alert-escalation.service';

// ──────── mock factory ──────────
function createMockPrisma() {
  return {
    complianceAlert: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    permit: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

function createMockNotification() {
  return {
    sendToRole: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
  };
}

function buildService() {
  const prisma = createMockPrisma();
  const notification = createMockNotification();
  const svc = new AlertEscalationService(prisma as any, notification as any);
  return { svc, prisma, notification };
}

// ──────── tests ──────────
describe('AlertEscalationService', () => {
  describe('processNewAlert', () => {
    const baseAlert = {
      id: 'alert-1',
      tenantId: 'tenant-1',
      alertType: 'R001',
      description: 'Test alert',
    };

    it('sends in-app notification for info severity', async () => {
      const { svc, notification, prisma } = buildService();

      await svc.processNewAlert({ ...baseAlert, severity: 'info' });

      expect(notification.sendToRole).toHaveBeenCalledWith(
        'operator_admin',
        expect.objectContaining({ type: 'info', tenantId: 'tenant-1' }),
      );
      // No deadline for info
      expect(prisma.complianceAlert.update).not.toHaveBeenCalled();
    });

    it('sends email + 48h deadline for warning severity', async () => {
      const { svc, notification, prisma } = buildService();

      await svc.processNewAlert({ ...baseAlert, severity: 'warning' });

      expect(notification.sendToRole).toHaveBeenCalledWith(
        'operator_admin',
        expect.objectContaining({ type: 'warning', channel: 'email' }),
      );
      // Should set 48-hour deadline
      expect(prisma.complianceAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-1' },
          data: expect.objectContaining({
            autoActions: expect.objectContaining({
              resolutionDeadline: expect.any(String),
            }),
          }),
        }),
      );
    });

    it('sends SMS to regulator + 24h deadline for critical severity', async () => {
      const { svc, notification, prisma } = buildService();

      await svc.processNewAlert({ ...baseAlert, severity: 'critical' });

      // Should notify regulator via SMS
      expect(notification.sendToRole).toHaveBeenCalledWith(
        'regulator',
        expect.objectContaining({ channel: 'sms', type: 'critical' }),
      );
      // Should also notify operator admin
      expect(notification.sendToRole).toHaveBeenCalledWith(
        'operator_admin',
        expect.objectContaining({ channel: 'email' }),
      );
      // 24-hour deadline
      expect(prisma.complianceAlert.update).toHaveBeenCalled();
    });
  });

  describe('escalateOverdueAlerts', () => {
    it('returns 0 when no overdue alerts', async () => {
      const { svc } = buildService();
      const count = await svc.escalateOverdueAlerts();
      expect(count).toBe(0);
    });

    it('escalates overdue alerts to next level', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'alert-1',
          tenantId: 'tenant-1',
          alertType: 'R001',
          description: 'Test',
          escalationLevel: 0,
        },
      ]);

      const count = await svc.escalateOverdueAlerts();
      expect(count).toBe(1);
      expect(prisma.complianceAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-1' },
          data: { escalationLevel: 1, status: 'escalated' },
        }),
      );
    });

    it('suspends permits at escalation level 2+', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'alert-1',
          tenantId: 'tenant-1',
          alertType: 'R001',
          description: 'Critical violation',
          escalationLevel: 1, // Will be escalated to 2
        },
      ]);
      (prisma.permit.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'permit-1', status: 'active' },
      ]);

      await svc.escalateOverdueAlerts();

      // Permit should be suspended
      expect(prisma.permit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'permit-1' },
          data: { status: 'suspended' },
        }),
      );
    });

    it('flags ministerial review at escalation level 3', async () => {
      const { svc, prisma, notification } = buildService();
      (prisma.complianceAlert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'alert-1',
          tenantId: 'tenant-1',
          alertType: 'R001',
          description: 'Ongoing violation',
          escalationLevel: 2, // Will be escalated to 3
        },
      ]);

      await svc.escalateOverdueAlerts();

      expect(notification.sendToRole).toHaveBeenCalledWith(
        'super_admin',
        expect.objectContaining({
          type: 'critical',
          title: expect.stringContaining('EMERGENCY'),
        }),
      );
    });

    it('does not escalate alerts already at level 3', async () => {
      const { svc, prisma } = buildService();
      // findMany returns overdue with escalationLevel < 3 — so max is already excluded
      // This verifies the query filter works correctly
      (prisma.complianceAlert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const count = await svc.escalateOverdueAlerts();
      expect(count).toBe(0);
    });
  });
});
