import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R012 — Destruction Compliance (Real-time)
 * Fires on destruction event creation. Validates witnesses, photos, method.
 */
@Injectable()
export class DestructionComplianceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R012';
  readonly evaluationType = 'real_time' as const;

  private readonly APPROVED_METHODS = [
    'incineration',
    'composting',
    'chemical_denaturation',
    'grinding',
    'grinding_and_burial',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const MIN_WITNESSES = 2;

    if (!context.entityId) {
      return this.fail('Destruction event ID not provided');
    }

    const destruction = await this.prisma.destructionEvent.findUnique({
      where: { id: context.entityId },
      include: { facility: true },
    });

    if (!destruction) {
      return this.fail('Destruction event not found');
    }

    const violations: string[] = [];

    // Check 1: Minimum witnesses
    const witnessCount = destruction.witnessNames?.length || 0;
    if (witnessCount < MIN_WITNESSES) {
      violations.push(
        `Only ${witnessCount} witness(es) — minimum ${MIN_WITNESSES} required`,
      );
    }

    // Check 2: Photos attached
    const photoCount = destruction.photos?.length || 0;
    if (photoCount === 0) {
      violations.push('No photos attached — photographic evidence is mandatory');
    }

    // Check 3: Approved destruction method
    if (!this.APPROVED_METHODS.includes(destruction.destructionMethod)) {
      violations.push(
        `Destruction method "${destruction.destructionMethod}" not approved — valid: ${this.APPROVED_METHODS.join(', ')}`,
      );
    }

    // Check 4: Quantity > 0
    if (!destruction.quantityKg || destruction.quantityKg <= 0) {
      violations.push('Destruction quantity not specified or zero');
    }

    const passed = violations.length === 0;

    return {
      ruleId: 'R012',
      ruleName: 'Destruction Compliance',
      passed,
      severity: passed ? 'info' : 'critical',
      description: passed
        ? 'Destruction event compliant — method, witnesses, and evidence verified'
        : `Destruction event non-compliant: ${violations.length} violation(s)`,
      details: {
        destructionId: destruction.id,
        facilityName: destruction.facility.name,
        method: destruction.destructionMethod,
        witnessCount,
        photoCount,
        violations,
      },
      suggestedAction: !passed
        ? 'Remediate violations before destruction can be marked complete'
        : undefined,
      autoAction: !passed
        ? {
            type: 'block_operation',
            params: { reason: 'destruction_non_compliant', destructionId: destruction.id },
          }
        : undefined,
    };
  }

  private fail(description: string): RuleEvaluationResult {
    return {
      ruleId: 'R012',
      ruleName: 'Destruction Compliance',
      passed: false,
      severity: 'critical',
      description,
      details: {},
    };
  }
}
