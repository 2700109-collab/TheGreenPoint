import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ComplianceEngine } from '../../compliance/engine/compliance-engine';

/**
 * Compliance Event Handler — triggers real-time compliance rule evaluation
 * when relevant domain events occur.
 */
@Injectable()
export class ComplianceEventHandler {
  private readonly logger = new Logger(ComplianceEventHandler.name);

  constructor(private readonly complianceEngine: ComplianceEngine) {}

  @OnEvent('lab_result.submitted')
  async onLabResultSubmitted(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('lab_result.submitted', data.payload);
  }

  @OnEvent('plant.created')
  async onPlantCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('plant.created', data.payload);
  }

  @OnEvent('plant.state_changed')
  async onPlantStateChanged(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('plant.state_changed', data.payload);
  }

  @OnEvent('plant.destroyed')
  async onPlantDestroyed(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('plant.destroyed', data.payload);
  }

  @OnEvent('batch.created')
  async onBatchCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('batch.created', data.payload);
  }

  @OnEvent('batch.weight_updated')
  async onBatchWeightUpdated(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('batch.weight_updated', data.payload);
  }

  @OnEvent('transfer.created')
  async onTransferCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('transfer.created', data.payload);
  }

  @OnEvent('transfer.accepted')
  async onTransferAccepted(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('transfer.accepted', data.payload);
  }

  @OnEvent('sale.created')
  async onSaleCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('sale.created', data.payload);
  }

  @OnEvent('permit.status_changed')
  async onPermitStatusChanged(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('permit.status_changed', data.payload);
  }

  @OnEvent('harvest.created')
  async onHarvestCreated(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('harvest.created', data.payload);
  }

  @OnEvent('destruction.recorded')
  async onDestructionRecorded(data: { payload: Record<string, unknown> }): Promise<void> {
    await this.safeEvaluate('destruction.recorded', data.payload);
  }

  private async safeEvaluate(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const tenantId = payload.tenantId as string;
      const entityId = payload.aggregateId as string || payload.entityId as string;
      const entityType = payload.aggregateType as string || eventType.split('.')[0] || 'unknown';

      if (!tenantId) {
        this.logger.warn(`No tenantId in event ${eventType} — skipping compliance evaluation`);
        return;
      }

      await this.complianceEngine.evaluateRealTime({
        tenantId,
        entityId,
        entityType,
        triggerEvent: eventType,
      });
    } catch (error) {
      this.logger.error(
        `Compliance evaluation failed for ${eventType}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
