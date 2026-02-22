/**
 * Section 3.2 — Rule Evaluator Interface (Strategy Pattern)
 * 
 * All compliance rules implement this interface.
 * The ComplianceEngine discovers and orchestrates evaluators at runtime.
 */

export interface RuleEvaluationContext {
  tenantId: string;
  facilityId?: string;
  entityType?: string;
  entityId?: string;
  triggerEvent?: string; // e.g., 'lab_result.created', 'transfer.accepted'
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  details: Record<string, unknown>;
  suggestedAction?: string;
  autoAction?: { type: string; params: Record<string, unknown> };
}

export interface RuleEvaluator {
  readonly ruleCode: string; // e.g., 'R001'
  readonly evaluationType: 'real_time' | 'batch' | 'scheduled';
  evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult>;
}

export const RULE_EVALUATORS = 'RULE_EVALUATORS';
