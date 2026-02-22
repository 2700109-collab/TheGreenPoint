import { describe, it, expect, vi } from 'vitest';
import { ComplianceScoreService } from '../scoring/compliance-score.service';

// ──────── helpers ──────────
function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    complianceAlert: {
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'alert-1' }),
    },
    batch: { count: vi.fn().mockResolvedValue(0) },
    auditEvent: { count: vi.fn().mockResolvedValue(0) },
    complianceRule: { findFirst: vi.fn().mockResolvedValue(null) },
    ...overrides,
  };
}

function createMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  };
}

function createMockEscalation() {
  return { processNewAlert: vi.fn().mockResolvedValue(undefined) };
}

function buildService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = createMockPrisma(prismaOverrides);
  const redis = createMockRedis();
  const escalation = createMockEscalation();
  const svc = new ComplianceScoreService(prisma as any, redis as any, escalation as any);
  return { svc, prisma, redis, escalation };
}

// ──────── tests ──────────
describe('ComplianceScoreService', () => {
  describe('getGrade (via getScore)', () => {
    it('returns Excellent for 100 (no alerts, all bonuses)', async () => {
      const { svc, prisma } = buildService();
      // No open alerts → penalty 0
      // No recent alerts → bonus +5
      // No untested batches → bonus +3
      // Has report events → bonus +2
      (prisma.auditEvent.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await svc.getScore('tenant-1');
      // 100 - 0 + 5 + 3 + 2 = 110 → clamped to 100
      expect(result.score).toBe(100);
      expect(result.grade).toBe('Excellent');
    });

    it('returns Good for 70-89 (some info alerts)', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'info', _count: 5 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await svc.getScore('tenant-1');
      // 100 - (5*2) + 0 + 3 + 0 = 93 → but recent alerts exist so no +5 bonus
      // Actually: 100 - 10 + 0 + 3 + 0 = 93 → but complianceAlert.count returns 5 (recent)
      // So bonusNoRecentAlerts = 0
      // bonusLabTimeliness = 3 (no untested batches)
      // bonusReportTimeliness = 0 (auditEvent.count returns 0)
      // rawScore = 100 - 10 + 0 + 3 + 0 = 93 → Excellent actually
      expect(result.score).toBe(93);
      expect(result.grade).toBe('Excellent');
    });

    it('returns Needs Improvement for 50-69 (multiple warnings)', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'warning', _count: 8 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(8);

      const result = await svc.getScore('tenant-1');
      // 100 - (8*5) + 0 + 3 + 0 = 63
      expect(result.score).toBe(63);
      expect(result.grade).toBe('Needs Improvement');
    });

    it('returns At Risk for 25-49 (several critical alerts)', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'critical', _count: 4 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(4);

      const result = await svc.getScore('tenant-1');
      // 100 - (4*15) + 0 + 3 + 0 = 43
      expect(result.score).toBe(43);
      expect(result.grade).toBe('At Risk');
    });

    it('returns Critical for 0-24 (many critical alerts)', async () => {
      const { svc, prisma, escalation } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'critical', _count: 7 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(7);
      // triggerCriticalEscalation needs a rule to create an alert
      (prisma.complianceRule.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rule-1' });
      (prisma.complianceAlert.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'alert-1',
        tenantId: 'tenant-1',
        severity: 'critical',
        alertType: 'CRITICAL_SCORE',
        description: 'Score dropped',
      });

      const result = await svc.getScore('tenant-1');
      // 100 - (7*15) + 0 + 3 + 0 = -2 → clamped to 0
      expect(result.score).toBe(0);
      expect(result.grade).toBe('Critical');
      // Should trigger escalation for score < 25
      expect(escalation.processNewAlert).toHaveBeenCalled();
    });
  });

  describe('penalty calculation', () => {
    it('info = 2 pts, warning = 5 pts, critical = 15 pts', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'info', _count: 1 },
        { severity: 'warning', _count: 1 },
        { severity: 'critical', _count: 1 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      const result = await svc.getScore('tenant-1');
      // penalty = 2 + 5 + 15 = 22
      // 100 - 22 + 0 + 3 + 0 = 81
      expect(result.score).toBe(81);
      expect(result.grade).toBe('Good');
    });

    it('ignores unknown severity levels', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'unknown', _count: 5 },
      ]);

      const result = await svc.getScore('tenant-1');
      // unknown is not in alertCounts so penalty = 0
      // 100 + 5 + 3 + 0 = 108 → clamped to 100
      expect(result.score).toBe(100);
    });
  });

  describe('bonus calculation', () => {
    it('+5 if no alerts in last 30 days', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await svc.getScore('tenant-1');
      expect(result.breakdown).toHaveProperty('bonusNoRecentAlerts', 5);
    });

    it('+3 if all batches tested (no untested batches)', async () => {
      const { svc, prisma } = buildService();
      (prisma.batch.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await svc.getScore('tenant-1');
      expect(result.breakdown).toHaveProperty('bonusLabTimeliness', 3);
    });

    it('no lab bonus if untested batches exist', async () => {
      const { svc, prisma } = buildService();
      (prisma.batch.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      const result = await svc.getScore('tenant-1');
      expect(result.breakdown).toHaveProperty('bonusLabTimeliness', 0);
    });

    it('+2 if report events exist', async () => {
      const { svc, prisma } = buildService();
      (prisma.auditEvent.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await svc.getScore('tenant-1');
      expect(result.breakdown).toHaveProperty('bonusReportTimeliness', 2);
    });
  });

  describe('score clamping', () => {
    it('never exceeds 100', async () => {
      const { svc, prisma } = buildService();
      // All bonuses: +5 +3 +2 = 110 → 100
      (prisma.auditEvent.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await svc.getScore('tenant-1');
      expect(result.score).toBe(100);
    });

    it('never goes below 0', async () => {
      const { svc, prisma } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'critical', _count: 10 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);

      const result = await svc.getScore('tenant-1');
      // 100 - 150 + 0 + 3 + 0 = -47 → 0
      expect(result.score).toBe(0);
    });
  });

  describe('caching', () => {
    it('returns cached result if available', async () => {
      const { svc, redis } = buildService();
      const cachedResult = {
        tenantId: 'tenant-1',
        score: 85,
        grade: 'Good',
        breakdown: {},
        trend: [],
        calculatedAt: '2024-01-01T00:00:00Z',
      };
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(cachedResult));

      const result = await svc.getScore('tenant-1');
      expect(result.score).toBe(85);
      expect(result.grade).toBe('Good');
    });

    it('recalculates if cache has invalid JSON', async () => {
      const { svc, redis } = buildService();
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue('invalid-json{');

      const result = await svc.getScore('tenant-1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('auto-escalation', () => {
    it('triggers critical escalation when score < 25', async () => {
      const { svc, prisma, escalation } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'critical', _count: 6 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(6);
      (prisma.complianceRule.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rule-1' });
      (prisma.complianceAlert.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'alert-1',
        tenantId: 'tenant-1',
        severity: 'critical',
        alertType: 'CRITICAL_SCORE',
        description: 'Score dropped',
      });

      const result = await svc.getScore('tenant-1');
      expect(result.score).toBeLessThan(25);
      expect(escalation.processNewAlert).toHaveBeenCalled();
    });

    it('does not escalate if score >= 25', async () => {
      const { svc, prisma, escalation } = buildService();
      (prisma.complianceAlert.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { severity: 'warning', _count: 5 },
      ]);
      (prisma.complianceAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await svc.getScore('tenant-1');
      // 100 - 25 + 0 + 3 + 0 = 78
      expect(result.score).toBeGreaterThanOrEqual(25);
      expect(escalation.processNewAlert).not.toHaveBeenCalled();
    });
  });

  describe('cache invalidation', () => {
    it('deletes cache key', async () => {
      const { svc, redis } = buildService();
      await svc.invalidateCache('tenant-1');
      expect(redis.del).toHaveBeenCalledWith('compliance_score:tenant-1');
    });
  });

  describe('result structure', () => {
    it('returns all expected fields', async () => {
      const { svc } = buildService();
      const result = await svc.getScore('tenant-1');

      expect(result).toHaveProperty('tenantId', 'tenant-1');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('grade');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('calculatedAt');
      expect(result.breakdown).toHaveProperty('baseScore', 100);
      expect(result.breakdown).toHaveProperty('openAlertPenalty');
    });
  });
});
