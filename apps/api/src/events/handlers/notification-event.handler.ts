import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

// Forward reference to avoid circular dep — actual NotificationService injected at runtime
import { NotificationService } from '../../notifications/notification.service';

/**
 * Notification Event Handler — translates domain events into user notifications.
 *
 * Severity mapping:
 *   critical  → in_app + sms (to regulators)
 *   warning   → in_app + email
 *   info      → in_app only
 */
@Injectable()
export class NotificationEventHandler {
  private readonly logger = new Logger(NotificationEventHandler.name);

  constructor(private readonly notifications: NotificationService) {}

  // ─── Critical events → in-app + SMS ──────────────────────────────

  @OnEvent('compliance_alert.created')
  async onComplianceAlert(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'critical',
        title: 'Compliance Alert',
        body: `Alert: ${p.alertType || 'compliance issue'} — severity ${p.severity || 'high'}`,
        entityType: 'compliance_alert',
        entityId: p.alertId as string,
        actionUrl: `/compliance/alerts/${p.alertId}`,
      }),
    );
    // Also notify regulators
    await this.safe(() =>
      this.notifications.sendToRole('regulator', {
        type: 'warning',
        title: 'New Compliance Alert',
        body: `Tenant alert: ${p.alertType || 'compliance issue'}`,
        entityType: 'compliance_alert',
        entityId: p.alertId as string,
      }),
    );
  }

  @OnEvent('plant.created')
  async onPlantCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'info',
        title: 'New Plant Registered',
        body: `Plant ${p.trackingId || 'unknown'} has been registered at facility ${p.facilityId || 'unknown'}`,
        entityType: 'plant',
        entityId: (p.aggregateId || p.entityId) as string,
      }),
    );
  }

  @OnEvent('plant.state_changed')
  async onPlantStateChanged(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'info',
        title: 'Plant State Changed',
        body: `Plant ${p.trackingId || 'unknown'} moved to ${p.newState || p.state || 'unknown'} state`,
        entityType: 'plant',
        entityId: (p.aggregateId || p.entityId) as string,
      }),
    );
  }

  @OnEvent('plant.destroyed')
  async onPlantDestroyed(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'info',
        title: 'Plant Destroyed',
        body: `Plant destruction recorded: ${p.trackingId || p.entityId || 'unknown'}`,
        entityType: 'plant',
        entityId: (p.aggregateId || p.entityId) as string,
      }),
    );
  }

  // ─── Warning events → in-app + email ─────────────────────────────

  @OnEvent('transfer.created')
  async onTransferCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.receiverTenantId as string ?? p.tenantId as string,
        role: 'operator_admin',
        type: 'warning',
        title: 'Incoming Transfer',
        body: `Transfer initiated from ${p.senderFacilityId || 'sender'} — requires acceptance`,
        channel: 'email',
        entityType: 'transfer',
        entityId: (p.aggregateId || p.transferId) as string,
        actionUrl: `/transfers/${p.aggregateId || p.transferId}`,
      }),
    );
  }

  @OnEvent('transfer.rejected')
  async onTransferRejected(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.senderTenantId as string ?? p.tenantId as string,
        role: 'operator_admin',
        type: 'warning',
        title: 'Transfer Rejected',
        body: `Transfer ${p.aggregateId || p.transferId} was rejected: ${p.reason || 'no reason given'}`,
        channel: 'email',
        entityType: 'transfer',
        entityId: (p.aggregateId || p.transferId) as string,
      }),
    );
  }

  @OnEvent('permit.status_changed')
  async onPermitStatusChanged(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'warning',
        title: 'Permit Status Changed',
        body: `Permit status updated to "${p.newStatus || p.status}"`,
        channel: 'email',
        entityType: 'permit',
        entityId: (p.aggregateId || p.permitId) as string,
        actionUrl: `/permits/${p.aggregateId || p.permitId}`,
      }),
    );
  }

  // ─── Info events → in-app only ───────────────────────────────────

  @OnEvent('lab_result.submitted')
  async onLabResultSubmitted(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'info',
        title: 'Lab Result Submitted',
        body: `Lab result received for batch ${p.batchId || 'unknown'}`,
        entityType: 'lab_result',
        entityId: (p.aggregateId || p.labResultId) as string,
      }),
    );
  }

  @OnEvent('harvest.created')
  async onHarvestCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'info',
        title: 'Harvest Recorded',
        body: `Harvest of ${p.plantCount || '?'} plants — ${p.wetWeight || '?'}kg wet weight`,
        entityType: 'harvest',
        entityId: (p.aggregateId || p.harvestId) as string,
      }),
    );
  }

  @OnEvent('inspection.completed')
  async onInspectionCompleted(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.tenantId as string,
        role: 'operator_admin',
        type: 'info',
        title: 'Inspection Completed',
        body: `Inspection outcome: ${p.outcome || 'pending'}`,
        entityType: 'inspection',
        entityId: (p.aggregateId || p.inspectionId) as string,
      }),
    );
  }

  @OnEvent('destruction.recorded')
  async onDestructionRecorded(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.sendToRole('regulator', {
        type: 'warning',
        title: 'Destruction Event Recorded',
        body: `${p.quantityKg || '?'}kg destroyed via ${p.method || 'unknown method'}`,
        entityType: 'destruction',
        entityId: (p.aggregateId || p.destructionId) as string,
      }),
    );
  }

  @OnEvent('transfer.accepted')
  async onTransferAccepted(data: { payload: Record<string, unknown> }): Promise<void> {
    const p = data.payload;
    await this.safe(() =>
      this.notifications.send({
        tenantId: p.senderTenantId as string ?? p.tenantId as string,
        role: 'operator_admin',
        type: 'info',
        title: 'Transfer Accepted',
        body: `Transfer ${p.aggregateId || p.transferId} has been accepted`,
        entityType: 'transfer',
        entityId: (p.aggregateId || p.transferId) as string,
      }),
    );
  }

  private async safe(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.error(
        `Notification dispatch failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
