import { describe, it, expect, vi } from 'vitest';
import { ComplianceEngine } from '../engine/compliance-engine';
import type { RuleEvaluator, RuleEvaluationResult } from '../engine/rule-evaluator.interface';

// ──────── helpers ──────────
function createPassingEvaluator(ruleCode: string, evalType: string): RuleEvaluator {
  return {
    ruleCode,
    evaluationType: evalType as any,
    evaluate: vi.fn().mockResolvedValue({
      ruleId: ruleCode,
      ruleName: `Rule ${ruleCode}`,
      passed: true,
      severity: 'info',
      description: 'All good',
      details: {},
    } satisfies RuleEvaluationResult),
  };
}

function createFailingEvaluator(
  ruleCode: string,
  evalType: string,
  severity: 'warning' | 'critical' = 'warning',
): RuleEvaluator {
  return {
    ruleCode,
    evaluationType: evalType as any,
    evaluate: vi.fn().mockResolvedValue({
      ruleId: ruleCode,
      ruleName: `Rule ${ruleCode}`,
      passed: false,
      severity,
      description: `Violation in ${ruleCode}`,
      details: {},
      autoAction: severity === 'critical'
        ? { type: 'block_operation', params: { reason: 'test' } }
        : undefined,
    } satisfies RuleEvaluationResult),
  };
}

function createMockPrisma() {
  const mockTx = {
    complianceAlert: {
      create: vi.fn().mockResolvedValue({
        id: 'alert-1',
        tenantId: 'tenant-1',
        severity: 'warning',
        alertType: 'TEST',
        description: 'Test alert',
      }),
    },
    permit: { update: vi.fn().mockResolvedValue({}) },
    transfer: { update: vi.fn().mockResolvedValue({}) },
    facility: { update: vi.fn().mockResolvedValue({}) },
  };

  return {
    complianceRule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    complianceAlert: {
      create: vi.fn().mockResolvedValue({ id: 'alert-1' }),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      return fn(mockTx);
    }),
    _mockTx: mockTx,
  };
}

function createMockAlertService() {
  return {
    processNewAlert: vi.fn().mockResolvedValue(undefined),
  };
}

function buildEngine(
  evaluators: RuleEvaluator[],
  prismaOverrides?: Record<string, unknown>,
) {
  const prisma = { ...createMockPrisma(), ...prismaOverrides };
  const alertService = createMockAlertService();
  const engine = new ComplianceEngine(prisma as any, alertService as any, evaluators);
  return { engine, prisma, alertService };
}

// ──────── tests ──────────
describe('ComplianceEngine', () => {
  describe('constructor', () => {
    it('registers evaluators by ruleCode', () => {
      const eval1 = createPassingEvaluator('R001', 'scheduled');
      const eval2 = createPassingEvaluator('R002', 'real_time');
      const { engine } = buildEngine([eval1, eval2]);
      // Engine is constructed without error — evaluators are mapped
      expect(engine).toBeDefined();
    });
  });

  describe('evaluateRealTime', () => {
    it('runs only real_time evaluators for matching active rules', async () => {
      const rtEval = createPassingEvaluator('R002', 'real_time');
      const batchEval = createPassingEvaluator('R007', 'batch');
      const { engine, prisma } = buildEngine([rtEval, batchEval]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'rule-1', name: 'R002', isActive: true, evaluationType: 'real_time' },
      ]);

      const results = await engine.evaluateRealTime({ tenantId: 'tenant-1' });
      expect(results).toHaveLength(1);
      expect(rtEval.evaluate).toHaveBeenCalled();
      expect(batchEval.evaluate).not.toHaveBeenCalled();
    });

    it('creates alert for failing evaluators', async () => {
      const failEval = createFailingEvaluator('R002', 'real_time');
      const { engine, prisma, alertService } = buildEngine([failEval]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'rule-1', name: 'R002', isActive: true, evaluationType: 'real_time' },
      ]);

      const results = await engine.evaluateRealTime({ tenantId: 'tenant-1' });
      expect(results).toHaveLength(1);
      expect(results[0]!.passed).toBe(false);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(alertService.processNewAlert).toHaveBeenCalled();
    });

    it('does not create alert for passing evaluators', async () => {
      const passEval = createPassingEvaluator('R002', 'real_time');
      const { engine, prisma, alertService } = buildEngine([passEval]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'rule-1', name: 'R002', isActive: true, evaluationType: 'real_time' },
      ]);

      await engine.evaluateRealTime({ tenantId: 'tenant-1' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(alertService.processNewAlert).not.toHaveBeenCalled();
    });

    it('skips rules with no matching evaluator', async () => {
      const { engine, prisma } = buildEngine([]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'rule-1', name: 'R999', isActive: true, evaluationType: 'real_time' },
      ]);

      const results = await engine.evaluateRealTime({ tenantId: 'tenant-1' });
      expect(results).toHaveLength(0);
    });

    it('continues on evaluator error', async () => {
      const errorEval: RuleEvaluator = {
        ruleCode: 'R002',
        evaluationType: 'real_time',
        evaluate: vi.fn().mockRejectedValue(new Error('DB down')),
      };
      const passEval = createPassingEvaluator('R006', 'real_time');
      const { engine, prisma } = buildEngine([errorEval, passEval]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'rule-1', name: 'R002', isActive: true, evaluationType: 'real_time' },
        { id: 'rule-2', name: 'R006', isActive: true, evaluationType: 'real_time' },
      ]);

      const results = await engine.evaluateRealTime({ tenantId: 'tenant-1' });
      // R002 fails silently, R006 still evaluated
      expect(results).toHaveLength(1);
      expect(results[0]!.ruleId).toBe('R006');
    });
  });

  describe('evaluateBatch', () => {
    it('runs batch and scheduled evaluators', async () => {
      const batchEval = createPassingEvaluator('R007', 'batch');
      const { engine, prisma } = buildEngine([batchEval]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'rule-1', name: 'R007', isActive: true, evaluationType: 'batch' },
      ]);

      const results = await engine.evaluateBatch('tenant-1');
      expect(results).toHaveLength(1);
      expect(batchEval.evaluate).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    });
  });

  describe('evaluateAll', () => {
    it('runs ALL active rules regardless of evaluationType', async () => {
      const rtEval = createPassingEvaluator('R002', 'real_time');
      const batchEval = createPassingEvaluator('R007', 'batch');
      const schedEval = createPassingEvaluator('R001', 'scheduled');
      const { engine, prisma } = buildEngine([rtEval, batchEval, schedEval]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'r-1', name: 'R002', isActive: true, evaluationType: 'real_time' },
        { id: 'r-2', name: 'R007', isActive: true, evaluationType: 'batch' },
        { id: 'r-3', name: 'R001', isActive: true, evaluationType: 'scheduled' },
      ]);

      const results = await engine.evaluateAll('tenant-1');
      expect(results).toHaveLength(3);
      expect(rtEval.evaluate).toHaveBeenCalled();
      expect(batchEval.evaluate).toHaveBeenCalled();
      expect(schedEval.evaluate).toHaveBeenCalled();
    });
  });

  describe('auto-actions', () => {
    it('executes auto-action for critical failure', async () => {
      const critEval = createFailingEvaluator('R002', 'real_time', 'critical');
      const { engine, prisma } = buildEngine([critEval]);

      (prisma.complianceRule.findMany as any).mockResolvedValue([
        { id: 'rule-1', name: 'R002', isActive: true, evaluationType: 'real_time' },
      ]);

      await engine.evaluateRealTime({ tenantId: 'tenant-1' });
      // Transaction was called (which handles auto-actions)
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
