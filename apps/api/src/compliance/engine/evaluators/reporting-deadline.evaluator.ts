import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R011 — Reporting Deadline Compliance (Scheduled — monthly, 1st at 6 AM)
 * Checks if operator submitted required monthly/quarterly reports.
 */
@Injectable()
export class ReportingDeadlineEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R011';
  readonly evaluationType = 'scheduled' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 7);

    const activePermits = await this.prisma.permit.findMany({
      where: { tenantId: context.tenantId, status: 'active' },
      select: { id: true, permitType: true },
    });

    if (activePermits.length === 0) return this.pass();

    // Required reports each month
    const requiredReports = [
      { type: 'monthly_production', period: previousMonth, deadline: `${currentMonth}-15` },
    ];

    // Quarterly reports: due in Jan, Apr, Jul, Oct
    const quarterMonths = [1, 4, 7, 10];
    if (quarterMonths.includes(now.getMonth() + 1)) {
      const qNum = Math.ceil(now.getMonth() / 3) || 4;
      requiredReports.push({
        type: 'quarterly_compliance',
        period: `${now.getFullYear()}-Q${qNum}`,
        deadline: `${currentMonth}-30`,
      });
    }

    // Check which were submitted (audit events)
    const submittedReports = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: context.tenantId,
        action: {
          in: [
            'report.monthly_production.submitted',
            'report.quarterly_compliance.submitted',
          ],
        },
        createdAt: { gte: new Date(`${previousMonth}-01`) },
      },
      select: { action: true },
    });

    const submittedTypes = new Set(
      submittedReports.map(r =>
        r.action.replace('report.', '').replace('.submitted', ''),
      ),
    );

    const overdue = requiredReports.filter(
      r => !submittedTypes.has(r.type) && new Date(r.deadline) < now,
    );

    return {
      ruleId: 'R011',
      ruleName: 'Reporting Deadline Compliance',
      passed: overdue.length === 0,
      severity: overdue.length === 0 ? 'info' : 'warning',
      description: overdue.length === 0
        ? 'All required reports submitted on time'
        : `${overdue.length} overdue report(s): ${overdue.map(r => r.type).join(', ')}`,
      details: { requiredReports, overdue },
      suggestedAction: overdue.length > 0
        ? 'Submit overdue reports immediately to maintain compliance standing'
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return {
      ruleId: 'R011',
      ruleName: 'Reporting Deadline Compliance',
      passed: true,
      severity: 'info',
      description: 'No active permits requiring reports',
      details: {},
    };
  }
}
