import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceEngine } from './engine/compliance-engine';
import { RuleEvaluator, RULE_EVALUATORS } from './engine/rule-evaluator.interface';
import { ALL_EVALUATORS } from './engine/evaluators';
import { AlertEscalationService } from './escalation/alert-escalation.service';
import { NotificationService } from './notification/notification.service';
import { ComplianceScoreService } from './scoring/compliance-score.service';
import { DiversionDetectorService } from './diversion/diversion-detector.service';
import { InventoryReconciliationService } from './inventory/inventory-reconciliation.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ComplianceController],
  providers: [
    // Rule evaluators registered as multi-provider for strategy pattern injection
    ...ALL_EVALUATORS,
    {
      provide: RULE_EVALUATORS,
      useFactory: (...evaluators: RuleEvaluator[]) => evaluators,
      inject: ALL_EVALUATORS,
    },
    ComplianceEngine,
    AlertEscalationService,
    NotificationService,
    ComplianceScoreService,
    DiversionDetectorService,
    InventoryReconciliationService,
  ],
  exports: [
    ComplianceEngine,
    AlertEscalationService,
    ComplianceScoreService,
    DiversionDetectorService,
    InventoryReconciliationService,
  ],
})
export class ComplianceModule {}
