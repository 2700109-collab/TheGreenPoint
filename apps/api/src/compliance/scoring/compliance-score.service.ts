import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AlertEscalationService } from '../escalation/alert-escalation.service';

/**
 * Section 3.6 — Compliance Scoring Service
 *
 * ComplianceScore (0-100) = BaseScore (100) - Σ(penalty per open alert)
 *
 * Penalty per severity:
 *   info     = 2 points
 *   warning  = 5 points
 *   critical = 15 points
 *
 * Bonus:
 *   +5 if no alerts in last 30 days
 *   +3 if all lab results submitted on time
 *   +2 if all reports submitted before deadline
 *
 * Thresholds:
 *   90-100 = "Excellent"
 *   70-89  = "Good"
 *   50-69  = "Needs Improvement"
 *   25-49  = "At Risk"
 *   0-24   = "Critical"
 */
@Injectable()
export class ComplianceScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly alertEscalation: AlertEscalationService,
  ) {}

  async getScore(tenantId: string): Promise<{
    tenantId: string;
    score: number;
    grade: string;
    breakdown: Record<string, unknown>;
    trend: { date: string; score: number }[];
    calculatedAt: string;
  }> {
    // Check Redis cache first
    const cacheKey = `compliance_score:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch { /* recalculate */ }
    }

    const result = await this.calculateScore(tenantId);

    // Auto-escalate when score falls below Critical threshold (< 25)
    if (result.score < 25) {
      await this.triggerCriticalEscalation(tenantId, result.score);
    }

    // Cache for 10 minutes
    await this.redis.set(cacheKey, JSON.stringify(result), 600);

    return result;
  }

  async invalidateCache(tenantId: string): Promise<void> {
    await this.redis.del(`compliance_score:${tenantId}`);
  }

  private async calculateScore(tenantId: string): Promise<{
    tenantId: string;
    score: number;
    grade: string;
    breakdown: Record<string, unknown>;
    trend: { date: string; score: number }[];
    calculatedAt: string;
  }> {
    // Count open alerts by severity
    const openAlerts = await this.prisma.complianceAlert.groupBy({
      by: ['severity'],
      where: {
        tenantId,
        status: { in: ['open', 'acknowledged', 'investigating', 'escalated'] },
      },
      _count: true,
    });

    const alertCounts = {
      info: 0,
      warning: 0,
      critical: 0,
    };
    for (const group of openAlerts) {
      if (group.severity in alertCounts) {
        alertCounts[group.severity as keyof typeof alertCounts] = group._count;
      }
    }

    const penalty =
      alertCounts.info * 2 +
      alertCounts.warning * 5 +
      alertCounts.critical * 15;

    // Bonus: no alerts in last 30 days
    const recentAlertCount = await this.prisma.complianceAlert.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    const bonusNoRecentAlerts = recentAlertCount === 0 ? 5 : 0;

    // Bonus: all batches have lab results within 30 days
    const MAX_DAYS = 30;
    const cutoff = new Date(Date.now() - MAX_DAYS * 24 * 60 * 60 * 1000);
    const untestedBatchCount = await this.prisma.batch.count({
      where: {
        tenantId,
        createdAt: { lte: cutoff },
        labResultId: null,
      },
    });
    const bonusLabTimeliness = untestedBatchCount === 0 ? 3 : 0;

    // Bonus: reports submitted (simplified — check for audit events)
    const reportEvents = await this.prisma.auditEvent.count({
      where: {
        tenantId,
        action: { startsWith: 'report.' },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    const bonusReportTimeliness = reportEvents > 0 ? 2 : 0;

    const rawScore =
      100 - penalty + bonusNoRecentAlerts + bonusLabTimeliness + bonusReportTimeliness;
    const score = Math.max(0, Math.min(100, rawScore));

    const grade = this.getGrade(score);

    // Build trend (weekly scores for last 12 weeks — simplified)
    const trend = await this.buildTrend(tenantId);

    return {
      tenantId,
      score,
      grade,
      breakdown: {
        baseScore: 100,
        openAlertPenalty: -penalty,
        bonusNoRecentAlerts,
        bonusLabTimeliness,
        bonusReportTimeliness,
        openAlerts: alertCounts,
      },
      trend,
      calculatedAt: new Date().toISOString(),
    };
  }

  private async triggerCriticalEscalation(tenantId: string, score: number): Promise<void> {
    // Check if we already have a recent critical-score alert (avoid spam)
    const recentCriticalAlert = await this.prisma.complianceAlert.findFirst({
      where: {
        tenantId,
        alertType: 'CRITICAL_SCORE',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentCriticalAlert) return;

    // Find any active compliance rule to associate with
    const rule = await this.prisma.complianceRule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!rule) return;

    const alert = await this.prisma.complianceAlert.create({
      data: {
        ruleId: rule.id,
        tenantId,
        severity: 'critical',
        alertType: 'CRITICAL_SCORE',
        description: `Compliance score dropped to ${score}/100 (Critical). Immediate investigation required.`,
        status: 'escalated',
        escalationLevel: 2,
      },
    });

    await this.alertEscalation.processNewAlert(alert);
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Improvement';
    if (score >= 25) return 'At Risk';
    return 'Critical';
  }

  private async buildTrend(tenantId: string): Promise<{ date: string; score: number }[]> {
    // For each of the last 12 weeks, count alerts that were open at that point
    const trend: { date: string; score: number }[] = [];
    const now = Date.now();

    for (let weekAgo = 11; weekAgo >= 0; weekAgo--) {
      const weekDate = new Date(now - weekAgo * 7 * 24 * 60 * 60 * 1000);
      const alertsAtTime = await this.prisma.complianceAlert.count({
        where: {
          tenantId,
          createdAt: { lte: weekDate },
          OR: [
            { resolvedAt: null },
            { resolvedAt: { gt: weekDate } },
          ],
        },
      });

      // Simplified: each open alert = ~5 point deduction (average)
      const estimatedScore = Math.max(0, Math.min(100, 100 - alertsAtTime * 5));
      trend.push({
        date: weekDate.toISOString().slice(0, 10),
        score: estimatedScore,
      });
    }

    return trend;
  }
}
