import { PermitExpiryEvaluator } from './permit-expiry.evaluator';
import { ThcLimitEvaluator } from './thc-limit.evaluator';
import { InventoryVarianceEvaluator } from './inventory-variance.evaluator';
import { TransferVelocityEvaluator } from './transfer-velocity.evaluator';
import { VerificationAnomalyEvaluator } from './verification-anomaly.evaluator';
import { WetDryRatioEvaluator } from './wet-dry-ratio.evaluator';
import { MassBalanceEvaluator } from './mass-balance.evaluator';
import { ProductionLimitEvaluator } from './production-limit.evaluator';
import { LabResultFrequencyEvaluator } from './lab-result-frequency.evaluator';
import { ZoneCapacityEvaluator } from './zone-capacity.evaluator';
import { ReportingDeadlineEvaluator } from './reporting-deadline.evaluator';
import { DestructionComplianceEvaluator } from './destruction-compliance.evaluator';
import { ImportExportBalanceEvaluator } from './import-export-balance.evaluator';
import { PermitActivityScopeEvaluator } from './permit-activity-scope.evaluator';

export {
  PermitExpiryEvaluator,
  ThcLimitEvaluator,
  InventoryVarianceEvaluator,
  TransferVelocityEvaluator,
  VerificationAnomalyEvaluator,
  WetDryRatioEvaluator,
  MassBalanceEvaluator,
  ProductionLimitEvaluator,
  LabResultFrequencyEvaluator,
  ZoneCapacityEvaluator,
  ReportingDeadlineEvaluator,
  DestructionComplianceEvaluator,
  ImportExportBalanceEvaluator,
  PermitActivityScopeEvaluator,
};

/** All evaluator classes for NestJS DI registration */
export const ALL_EVALUATORS = [
  PermitExpiryEvaluator,
  ThcLimitEvaluator,
  InventoryVarianceEvaluator,
  TransferVelocityEvaluator,
  VerificationAnomalyEvaluator,
  WetDryRatioEvaluator,
  MassBalanceEvaluator,
  ProductionLimitEvaluator,
  LabResultFrequencyEvaluator,
  ZoneCapacityEvaluator,
  ReportingDeadlineEvaluator,
  DestructionComplianceEvaluator,
  ImportExportBalanceEvaluator,
  PermitActivityScopeEvaluator,
];
