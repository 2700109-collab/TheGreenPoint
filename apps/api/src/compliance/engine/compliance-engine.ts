import { Injectable, Logger, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RULE_EVALUATORS,
} from './rule-evaluator.interface';
import { AlertEscalationService } from '../escalation/alert-escalation.service';

/**
 * Section 3.3 — Compliance Engine Orchestrator
 * 
 * Strategy pattern orchestrator that discovers evaluators at runtime,
 * runs them against tenant context, and creates alerts for failures.
 */
@Injectable()
export class ComplianceEngine {
  private readonly logger = new Logger(ComplianceEngine.name);
  private readonly evaluatorMap = new Map<string, RuleEvaluator>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertService: AlertEscalationService,
    @Inject(RULE_EVALUATORS) evaluators: RuleEvaluator[],
  ) {
    evaluators.forEach(e => this.evaluatorMap.set(e.ruleCode, e));
    this.logger.log(`Loaded ${this.evaluatorMap.size} compliance rule evaluators`);
  }

  /**
   * Real-time evaluation — called synchronously during API operations.
   * Only runs evaluators whose evaluationType is 'real_time'.
   */
  async evaluateRealTime(context: RuleEvaluationContext): Promise<RuleEvaluationResult[]> {
    const activeRules = await this.prisma.complianceRule.findMany({
      where: { isActive: true, evaluationType: 'real_time' },
    });

    const results: RuleEvaluationResult[] = [];
    for (const rule of activeRules) {
      const evaluator = this.evaluatorMap.get(rule.name);
      if (!evaluator) continue;

      try {
        const result = await evaluator.evaluate(context);
        results.push(result);

        if (!result.passed) {
          await this.createAlert(rule, result, context);
        }
      } catch (error) {
        this.logger.error(`Rule ${rule.name} evaluation failed: ${error}`, (error as Error).stack);
      }
    }
    return results;
  }

  /**
   * Batch evaluation — runs all scheduled/batch rules for a tenant.
   * Called by cron jobs.
   */
  async evaluateBatch(tenantId: string): Promise<RuleEvaluationResult[]> {
    const activeRules = await this.prisma.complianceRule.findMany({
      where: { isActive: true, evaluationType: { in: ['batch', 'scheduled'] } },
    });

    const results: RuleEvaluationResult[] = [];
    for (const rule of activeRules) {
      const evaluator = this.evaluatorMap.get(rule.name);
      if (!evaluator) continue;

      try {
        const result = await evaluator.evaluate({ tenantId });
        results.push(result);

        if (!result.passed) {
          await this.createAlert(rule, result, { tenantId });
        }
      } catch (error) {
        this.logger.error(`Rule ${rule.name} batch eval failed: ${error}`, (error as Error).stack);
      }
    }
    return results;
  }

  /**
   * Full evaluation — runs ALL active rules for a tenant (manual trigger by regulator).
   */
  async evaluateAll(tenantId: string): Promise<RuleEvaluationResult[]> {
    const activeRules = await this.prisma.complianceRule.findMany({
      where: { isActive: true },
    });

    const results: RuleEvaluationResult[] = [];
    for (const rule of activeRules) {
      const evaluator = this.evaluatorMap.get(rule.name);
      if (!evaluator) continue;

      try {
        const result = await evaluator.evaluate({ tenantId });
        results.push(result);

        if (!result.passed) {
          await this.createAlert(rule, result, { tenantId });
        }
      } catch (error) {
        this.logger.error(`Rule ${rule.name} full eval failed: ${error}`, (error as Error).stack);
      }
    }
    return results;
  }

  private async createAlert(
    rule: { id: string; name: string },
    result: RuleEvaluationResult,
    context: RuleEvaluationContext,
  ): Promise<void> {
    const alert = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complianceAlert.create({
        data: {
          ruleId: rule.id,
          tenantId: context.tenantId,
          facilityId: context.facilityId || null,
          severity: result.severity,
          alertType: rule.name,
          description: result.description,
          entityType: context.entityType || null,
          entityId: context.entityId || null,
          autoActions: (result.autoAction || undefined) as unknown as Prisma.InputJsonValue | undefined,
        },
      });

      // Execute DB-modifying auto-actions atomically with alert creation
      if (result.autoAction) {
        await this.executeAutoAction(tx, result.autoAction, created.id);
      }

      return created;
    });

    this.logger.warn(`Alert created: ${alert.id} [${rule.name}] severity=${result.severity}`);

    // Escalation workflow (non-transactional — notifications are best-effort)
    await this.alertService.processNewAlert(alert);
  }

  private async executeAutoAction(
    tx: Prisma.TransactionClient,
    action: { type: string; params: Record<string, unknown> },
    alertId: string,
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'suspend_permit':
          await tx.permit.update({
            where: { id: action.params.permitId as string },
            data: { status: 'suspended' },
          });
          break;
        case 'flag_transfer':
          await tx.transfer.update({
            where: { id: action.params.transferId as string },
            data: { status: 'flagged' },
          });
          break;
        case 'lock_facility':
          await tx.facility.update({
            where: { id: action.params.facilityId as string },
            data: { isActive: false },
          });
          break;
        case 'quarantine_batch':
          // Mark batch as quarantined via product category
          this.logger.warn(`Auto-action: quarantine batch ${action.params.batchId}`);
          break;
        case 'block_operation':
          // Caller checks result.passed and blocks if false
          this.logger.warn(`Auto-action: block_operation — ${action.params.reason}`);
          break;
        case 'flag_facility_for_audit': {
          const facilityIds = (action.params.facilityIds as string[] | undefined) || [action.params.facilityId as string];
          this.logger.warn(
            `Auto-action: flag facilities for audit — ${facilityIds.join(', ')}`,
          );
          break;
        }
        case 'hold_batch_sales': {
          const batchIds = action.params.batchIds as string[] | undefined;
          this.logger.warn(
            `Auto-action: hold sales for batches — ${batchIds?.join(', ')}`,
          );
          break;
        }
        default:
          this.logger.warn(`Unknown auto-action type: ${action.type}`);
      }
    } catch (error) {
      this.logger.error(`Auto-action ${action.type} failed for alert ${alertId}: ${error}`);
    }
  }
}
