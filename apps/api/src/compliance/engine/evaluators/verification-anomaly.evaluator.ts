import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  RuleEvaluator,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from '../rule-evaluator.interface';

/**
 * R005 — Verification Pattern Anomaly (Batch — weekly Sunday 3 AM)
 * Analyzes QR verification scans for counterfeiting and diversion signals.
 */
@Injectable()
export class VerificationAnomalyEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R005';
  readonly evaluationType = 'batch' as const;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(_context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const SCAN_THRESHOLD_24H = 20;
    const GEO_SCATTER_KM = 500;
    const LOOKBACK_DAYS = 7;
    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Fetch verification scan events from outbox
    const scanEvents = await this.prisma.outboxEvent.findMany({
      where: {
        eventType: 'verification.scanned',
        createdAt: { gte: lookbackDate },
      },
      select: { aggregateId: true, payload: true, createdAt: true },
    });

    const anomalies: { type: string; entityId: string; details: Record<string, unknown> }[] = [];

    // Group by entity (tracking ID)
    const byEntity = new Map<string, typeof scanEvents>();
    for (const event of scanEvents) {
      const group = byEntity.get(event.aggregateId) || [];
      group.push(event);
      byEntity.set(event.aggregateId, group);
    }

    for (const [entityId, events] of byEntity) {
      // Check 1: High-frequency scanning (>20 in any 24h window)
      const sorted = events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i]!;
        const windowEnd = new Date(current.createdAt.getTime() + 24 * 60 * 60 * 1000);
        const windowCount = sorted.filter(
          e => e.createdAt >= current.createdAt && e.createdAt <= windowEnd,
        ).length;
        if (windowCount > SCAN_THRESHOLD_24H) {
          anomalies.push({
            type: 'high_frequency',
            entityId,
            details: { scanCount: windowCount, windowStart: current.createdAt.toISOString() },
          });
          break;
        }
      }

      // Check 2: Geographic scatter (>500km between any two scans)
      const locations = events
        .map(e => (e.payload as Record<string, unknown>)?.location as { lat: number; lng: number } | undefined)
        .filter((loc): loc is { lat: number; lng: number } => !!loc?.lat && !!loc?.lng);

      for (let i = 0; i < locations.length; i++) {
        let found = false;
        for (let j = i + 1; j < locations.length; j++) {
          const locI = locations[i]!;
          const locJ = locations[j]!;
          const distance = this.haversineKm(
            locI.lat, locI.lng,
            locJ.lat, locJ.lng,
          );
          if (distance > GEO_SCATTER_KM) {
            anomalies.push({
              type: 'geographic_scatter',
              entityId,
              details: { distanceKm: +distance.toFixed(0), loc1: locI, loc2: locJ },
            });
            found = true;
            break;
          }
        }
        if (found) break;
      }

      // Check 3: Non-SA IP addresses (heuristic — SA ranges start with 196., 197., 41.)
      const nonSaScans = events.filter(e => {
        const ip = (e.payload as Record<string, unknown>)?.ip as string | undefined;
        return ip && !ip.startsWith('196.') && !ip.startsWith('197.') && !ip.startsWith('41.');
      });
      if (nonSaScans.length > 0) {
        anomalies.push({
          type: 'non_sa_ip',
          entityId,
          details: {
            count: nonSaScans.length,
            ips: nonSaScans.map(e => (e.payload as Record<string, unknown>)?.ip as string).slice(0, 5),
          },
        });
      }
    }

    return {
      ruleId: 'R005',
      ruleName: 'Verification Pattern Anomaly',
      passed: anomalies.length === 0,
      severity: anomalies.length === 0
        ? 'info'
        : anomalies.some(a => a.type === 'high_frequency')
          ? 'critical'
          : 'warning',
      description: anomalies.length === 0
        ? 'No verification anomalies detected'
        : `${anomalies.length} verification anomalies across ${new Set(anomalies.map(a => a.entityId)).size} entities`,
      details: { anomalies },
      suggestedAction: anomalies.length > 0
        ? 'Investigate flagged entities for potential counterfeiting or parallel market activity'
        : undefined,
    };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
