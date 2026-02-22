import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

/** Shape returned by getStatistics */
interface PublicStatistics {
  lastUpdated: string;
  national: {
    totalLicensedOperators: number;
    totalActiveFacilities: number;
    totalActivePlants: number;
    provinceDistribution: Record<string, number>;
    averageComplianceScore: number;
    totalVerificationsLast30Days: number;
  };
}

const CACHE_KEY = 'public:statistics';
const CACHE_TTL = 3600; // 1 hour

/**
 * Section 8.4 — Public Statistics Service
 *
 * Provides aggregate, anonymised national statistics.
 * Cached in Redis for 1 hour. Province-level suppression
 * applied when fewer than 3 operators to avoid identification.
 */
@Injectable()
export class PublicStatisticsService {
  private readonly logger = new Logger(PublicStatisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Return aggregate national statistics, cached for 1 hour.
   */
  async getStatistics(): Promise<PublicStatistics> {
    // Check Redis cache
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) {
      this.logger.debug('Returning cached public statistics');
      return JSON.parse(cached);
    }

    this.logger.log('Computing public statistics (cache miss)');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalLicensedOperators,
      totalActiveFacilities,
      totalActivePlants,
      facilities,
      verificationCount,
      tenants,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.facility.count({ where: { isActive: true } }),
      this.prisma.plant.count({ where: { state: { notIn: ['harvested', 'destroyed'] } } }),
      this.prisma.facility.findMany({
        where: { isActive: true },
        select: { province: true, tenantId: true },
      }),
      this.prisma.verificationLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.tenant.findMany({
        where: { isActive: true },
        select: { complianceStatus: true },
      }),
    ]);

    // Province distribution — count distinct operators per province
    const provinceOperatorMap: Record<string, Set<string>> = {};
    for (const f of facilities) {
      const province = f.province ?? 'Unknown';
      if (!provinceOperatorMap[province]) {
        provinceOperatorMap[province] = new Set();
      }
      provinceOperatorMap[province].add(f.tenantId);
    }

    // Apply suppression: omit provinces with < 3 operators
    const provinceDistribution: Record<string, number> = {};
    for (const [province, operatorSet] of Object.entries(provinceOperatorMap)) {
      if (operatorSet.size >= 3) {
        provinceDistribution[province] = operatorSet.size;
      }
    }

    // Average compliance score — map status to numeric score
    const scoreMap: Record<string, number> = {
      compliant: 100,
      minor_non_compliance: 70,
      major_non_compliance: 40,
      suspended: 10,
    };
    const scores = tenants.map(
      (t) => scoreMap[t.complianceStatus ?? 'compliant'] ?? 50,
    );
    const averageComplianceScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    const result = {
      lastUpdated: new Date().toISOString(),
      national: {
        totalLicensedOperators,
        totalActiveFacilities,
        totalActivePlants,
        provinceDistribution,
        averageComplianceScore,
        totalVerificationsLast30Days: verificationCount,
      },
    };

    // Cache for 1 hour
    await this.redis.set(CACHE_KEY, JSON.stringify(result), CACHE_TTL);

    return result;
  }
}
