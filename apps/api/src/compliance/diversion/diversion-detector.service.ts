import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Section 3.7 — Diversion Detection Service
 *
 * Combines results from mass balance, wet-dry ratio, transfer velocity,
 * and verification pattern analyses into a unified diversion risk report.
 */
@Injectable()
export class DiversionDetectorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(tenantId: string): Promise<DiversionReport> {
    const [massBalance, wetDryRatio, transferVelocity, verificationPatterns] =
      await Promise.all([
        this.analyzeMassBalance(tenantId),
        this.analyzeWetDryRatio(tenantId),
        this.analyzeTransferVelocity(tenantId),
        this.analyzeVerificationPatterns(tenantId),
      ]);

    const scores = [
      massBalance.riskScore,
      wetDryRatio.riskScore,
      transferVelocity.riskScore,
      verificationPatterns.riskScore,
    ];
    const riskScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    return {
      tenantId,
      overallRisk:
        riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low',
      riskScore,
      analyses: { massBalance, wetDryRatio, transferVelocity, verificationPatterns },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Run mass balance check for a single tenant.
   * Used by the daily scheduler job (03:00 SAST).
   */
  async runMassBalanceCheck(tenantId: string): Promise<AnalysisResult> {
    return this.analyzeMassBalance(tenantId);
  }

  /**
   * Run verification pattern analysis for a single tenant.
   * Used by the weekly scheduler job (Monday 04:00 SAST).
   */
  async runVerificationPatternAnalysis(tenantId: string): Promise<AnalysisResult> {
    return this.analyzeVerificationPatterns(tenantId);
  }

  private async analyzeMassBalance(tenantId: string): Promise<AnalysisResult> {
    const facilities = await this.prisma.facility.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });

    const issues: string[] = [];
    let riskScore = 0;

    for (const facility of facilities) {
      const harvestTotal = await this.prisma.harvest.aggregate({
        where: { facilityId: facility.id },
        _sum: { dryWeightGrams: true },
      });

      const batchTotal = await this.prisma.batch.aggregate({
        where: { facilityId: facility.id },
        _sum: { processedWeightGrams: true },
      });

      const input = harvestTotal._sum.dryWeightGrams || 0;
      const output = batchTotal._sum.processedWeightGrams || 0;

      if (input > 0) {
        const variance = Math.abs(input - output) / input;
        if (variance > 0.1) {
          issues.push(`${facility.name}: ${(variance * 100).toFixed(1)}% mass imbalance (EMERGENCY)`);
          riskScore = Math.max(riskScore, 90);
        } else if (variance > 0.05) {
          issues.push(`${facility.name}: ${(variance * 100).toFixed(1)}% mass imbalance (critical)`);
          riskScore = Math.max(riskScore, 70);
        } else if (variance > 0.02) {
          issues.push(`${facility.name}: ${(variance * 100).toFixed(1)}% mass imbalance (warning)`);
          riskScore = Math.max(riskScore, 40);
        }
      }
    }

    return {
      name: 'Mass Balance Analysis',
      riskScore,
      findings: issues.length === 0 ? ['All facilities within 2% tolerance'] : issues,
      recommendation: riskScore >= 70
        ? 'Initiate investigation — persistent mass imbalance indicates potential diversion'
        : riskScore >= 40
          ? 'Schedule physical inventory verification'
          : 'No action needed',
    };
  }

  private async analyzeWetDryRatio(tenantId: string): Promise<AnalysisResult> {
    const harvests = await this.prisma.harvest.findMany({
      where: {
        tenantId,
        dryWeightGrams: { not: null },
      },
      select: {
        id: true,
        wetWeightGrams: true,
        dryWeightGrams: true,
        facility: { select: { name: true } },
      },
    });

    const issues: string[] = [];
    let riskScore = 0;

    for (const h of harvests) {
      if (!h.dryWeightGrams || !h.wetWeightGrams) continue;
      const ratio = h.wetWeightGrams / h.dryWeightGrams;

      if (ratio < 1.5 || ratio > 9.0) {
        issues.push(
          `Harvest ${h.id.slice(0, 8)} at ${h.facility.name}: ratio ${ratio.toFixed(2)}:1 (CRITICAL)`,
        );
        riskScore = Math.max(riskScore, 80);
      } else if (ratio < 2.0 || ratio > 7.0) {
        issues.push(
          `Harvest ${h.id.slice(0, 8)} at ${h.facility.name}: ratio ${ratio.toFixed(2)}:1 (warning)`,
        );
        riskScore = Math.max(riskScore, 45);
      }
    }

    return {
      name: 'Wet-to-Dry Ratio Analysis',
      riskScore,
      findings: issues.length === 0
        ? ['All harvests within normal ratio range (2:1 – 7:1)']
        : issues,
      recommendation: riskScore >= 70
        ? 'Investigate harvests with abnormal ratios — possible material manipulation'
        : 'No action needed',
    };
  }

  private async analyzeTransferVelocity(tenantId: string): Promise<AnalysisResult> {
    const LOOKBACK_DAYS = 30;
    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const allCounts = await this.prisma.transfer.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: lookbackDate } },
      _count: true,
    });

    if (allCounts.length < 3) {
      return {
        name: 'Transfer Velocity Analysis',
        riskScore: 0,
        findings: ['Insufficient data for statistical analysis'],
        recommendation: 'No action needed — system needs more operational data',
      };
    }

    const counts = allCounts.map(t => t._count);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdDev = Math.sqrt(
      counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length,
    );

    const tenantCount = allCounts.find(t => t.tenantId === tenantId)?._count || 0;
    const zScore = stdDev > 0 ? (tenantCount - mean) / stdDev : 0;

    const issues: string[] = [];
    let riskScore = 0;

    if (zScore > 5) {
      issues.push(`Transfer rate z-score ${zScore.toFixed(2)} (CRITICAL — >5σ above mean)`);
      riskScore = 85;
    } else if (zScore > 3) {
      issues.push(`Transfer rate z-score ${zScore.toFixed(2)} (warning — >3σ above mean)`);
      riskScore = 50;
    }

    // Check for unusual patterns (placeholder for future night-hours analysis)
    await this.prisma.transfer.count({
      where: {
        tenantId,
        createdAt: { gte: lookbackDate },
        // Night hours proxy: check via raw SQL if needed
      },
    });

    return {
      name: 'Transfer Velocity Analysis',
      riskScore,
      findings: issues.length === 0
        ? [`Transfer rate normal (${tenantCount} transfers in ${LOOKBACK_DAYS} days, z-score: ${zScore.toFixed(2)})`]
        : issues,
      recommendation: riskScore >= 70
        ? 'Investigate unusual transfer volume — potential diversion'
        : 'No action needed',
    };
  }

  private async analyzeVerificationPatterns(_tenantId: string): Promise<AnalysisResult> {
    const LOOKBACK_DAYS = 30;
    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const scanEvents = await this.prisma.outboxEvent.count({
      where: {
        eventType: 'verification.scanned',
        createdAt: { gte: lookbackDate },
      },
    });

    // Simplified: if very high scan count, flag
    const issues: string[] = [];
    let riskScore = 0;

    if (scanEvents > 1000) {
      issues.push(`High verification scan volume: ${scanEvents} scans in ${LOOKBACK_DAYS} days`);
      riskScore = 40;
    }

    return {
      name: 'Verification Pattern Analysis',
      riskScore,
      findings: issues.length === 0
        ? [`Normal verification activity (${scanEvents} scans in ${LOOKBACK_DAYS} days)`]
        : issues,
      recommendation: riskScore >= 40
        ? 'Review scan patterns for potential counterfeiting signals'
        : 'No action needed',
    };
  }
}

export interface DiversionReport {
  tenantId: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  analyses: {
    massBalance: AnalysisResult;
    wetDryRatio: AnalysisResult;
    transferVelocity: AnalysisResult;
    verificationPatterns: AnalysisResult;
  };
  generatedAt: string;
}

export interface AnalysisResult {
  name: string;
  riskScore: number;
  findings: string[];
  recommendation: string;
}
