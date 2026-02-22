import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Tenant, Permit, Inspection } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../redis/redis.service';
import type { RegulatoryDashboardDto, PaginatedResponse } from '@ncts/shared-types';

/** Shape of operator list items returned by getOperators */
interface OperatorWithCounts extends Tenant {
  _count: {
    facilities: number;
    plants: number;
    permits: number;
    batches: number;
    sales: number;
  };
  permits: Array<{ id: string; permitType: string; expiryDate: Date }>;
}

/** Shape of permit list items returned by getPermits */
interface PermitWithRelations extends Permit {
  tenant: { id: string; name: string; tradingName: string | null };
  facility: { id: string; name: string; province: string };
}

/** Shape of compliance alert returned by getComplianceAlerts */
interface ComplianceAlertItem {
  id: string;
  severity: string;
  type: string;
  description: string;
  operatorName: string;
  facilityName: string;
  createdAt: string;
}

/** Shape returned by getKpis */
interface RegulatoryKpis {
  operators: { total: number; active: number };
  facilities: { total: number; active: number };
  plants: { total: number; active: number };
  permits: { active: number; expired: number };
  batches: { total: number };
  inspections: { pending: number; completed: number; failed: number };
  alerts: { open: number; critical: number };
  destruction: { total: number };
  updatedAt: string;
}

/** Shape returned by getComplianceOverview */
interface ComplianceOverview {
  statusBreakdown: Array<{ status: string; count: number }>;
  severityBreakdown: Array<{ severity: string; count: number }>;
  recentAlerts: Array<{
    id: string;
    severity: string;
    alertType: string;
    description: string;
    status: string;
    createdAt: Date;
  }>;
}

/** Shape returned by getAlertSummary */
interface AlertSummary {
  totalOpen: number;
  totalResolved: number;
  byType: Array<{ type: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
}

/** Shape of inspection calendar items */
interface InspectionCalendarItem {
  id: string;
  type: string;
  priority: string;
  status: string;
  scheduledDate: Date;
  inspectorId: string;
  facility: { id: string; name: string; province: string };
}

/** Shape of monthly production trend entry */
interface ProductionTrendEntry {
  month: string;
  plants: number;
  harvests: number;
  harvestWeightKg: number;
  batches: number;
  destructionKg: number;
}

/** Shape of geographic summary entry */
interface GeographicSummaryEntry {
  province: string;
  facilities: number;
  plants: number;
  inspections: number;
}

/** Shape returned by getOperatorDrillDown */
interface OperatorDrillDown {
  tenant: {
    id: string;
    name: string;
    tradingName: string | null;
    registrationNumber: string;
    complianceStatus: string | null;
    province: string | null;
    bbbeeLevel: number | null;
  };
  facilities: Array<{
    id: string;
    name: string;
    province: string;
    facilityType: string;
    _count: { plants: number; inspections: number; destructionEvents: number };
  }>;
  permits: Array<{
    id: string;
    permitNumber: string;
    permitType: string;
    status: string;
    expiryDate: Date;
  }>;
  counts: Record<string, number>;
  recentAlerts: Array<{
    id: string;
    severity: string;
    alertType: string;
    description: string;
    status: string;
    createdAt: Date;
  }>;
}

/** Shape returned by getNationalSummary */
interface NationalSummary {
  activeOperators: number;
  activeFacilities: number;
  activePlants: number;
  totalBatches: number;
  yearToDate: {
    salesCount: number;
    salesRevenueZar: number;
    salesVolumeGrams: number;
    destructionCount: number;
    destructionKg: number;
  };
  openAlerts: number;
  pendingInspections: number;
  updatedAt: string;
}

/** Shape of municipal summary entry */
interface MunicipalSummaryEntry {
  province: string;
  facilities: number;
  licensed: number;
  expiredLicenses: number;
  plants: number;
}

/** Shape returned by getMunicipalDrillDown */
interface MunicipalDrillDown {
  municipalityCode: string;
  facilityCount: number;
  activeLicenses: number;
  expiredLicenses: number;
  totalPlants: number;
  facilities: Array<{
    id: string;
    name: string;
    tenant: string;
    municipalLicense: string | null;
    licenseExpiry: string | null;
    plantCount: number;
    inspectionCount: number;
  }>;
}

@Injectable()
export class RegulatoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly redis: RedisService,
  ) {}

  async getDashboard(): Promise<RegulatoryDashboardDto> {
    const [
      totalOperators,
      totalPlants,
      totalFacilities,
      activePermits,
      totalTenants,
      nonCompliantCount,
      recentAuditEvents,
      pendingInspections,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.plant.count(),
      this.prisma.facility.count({ where: { isActive: true } }),
      this.prisma.permit.count({ where: { status: 'active' } }),
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { complianceStatus: { not: 'compliant' } } }),
      this.prisma.auditEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          entityType: true,
          action: true,
          actorId: true,
          actorRole: true,
          tenantId: true,
          createdAt: true,
        },
      }),
      this.prisma.inspection.count({ where: { status: 'scheduled' } }),
    ]);

    const complianceRate = totalTenants > 0
      ? Math.round(((totalTenants - nonCompliantCount) / totalTenants) * 100)
      : 100;

    const recentActivity = recentAuditEvents.map((e) => ({
      id: e.id,
      type: e.action,
      description: `${e.action} on ${e.entityType}`,
      operatorName: e.tenantId ?? 'system',
      timestamp: e.createdAt.toISOString(),
    }));

    return {
      totalOperators,
      totalPlants,
      totalFacilities,
      activePermits,
      complianceRate,
      pendingInspections,
      flaggedOperators: nonCompliantCount,
      recentActivity,
    };
  }

  async getTrends() {
    // Monthly plant registrations for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [plants, harvests, sales] = await Promise.all([
      this.prisma.plant.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
      this.prisma.harvest.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true, wetWeightGrams: true },
      }),
      this.prisma.sale.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true, priceZar: true, quantityGrams: true },
      }),
    ]);

    // Group by month
    const monthlyData: Record<string, { plants: number; harvests: number; salesRevenue: number; salesVolume: number }> = {};
    const formatMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    for (const p of plants) {
      const key = formatMonth(p.createdAt);
      if (!monthlyData[key]) monthlyData[key] = { plants: 0, harvests: 0, salesRevenue: 0, salesVolume: 0 };
      monthlyData[key].plants++;
    }
    for (const h of harvests) {
      const key = formatMonth(h.createdAt);
      if (!monthlyData[key]) monthlyData[key] = { plants: 0, harvests: 0, salesRevenue: 0, salesVolume: 0 };
      monthlyData[key].harvests++;
    }
    for (const s of sales) {
      const key = formatMonth(s.createdAt);
      if (!monthlyData[key]) monthlyData[key] = { plants: 0, harvests: 0, salesRevenue: 0, salesVolume: 0 };
      monthlyData[key].salesRevenue += s.priceZar;
      monthlyData[key].salesVolume += s.quantityGrams;
    }

    return {
      data: Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({ month, ...values })),
    };
  }

  async getFacilitiesGeo() {
    const facilities = await this.prisma.facility.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        facilityType: true,
        province: true,
        latitude: true,
        longitude: true,
        boundary: true,
        tenant: { select: { id: true, name: true, tradingName: true, complianceStatus: true } },
        _count: { select: { plants: true, permits: true } },
      },
    });

    return {
      type: 'FeatureCollection',
      features: facilities.map((f) => ({
        type: 'Feature',
        geometry: f.boundary ?? {
          type: 'Point',
          coordinates: [f.longitude, f.latitude],
        },
        properties: {
          id: f.id,
          name: f.name,
          facilityType: f.facilityType,
          province: f.province,
          operator: f.tenant.tradingName || f.tenant.name,
          complianceStatus: f.tenant.complianceStatus,
          plantCount: f._count.plants,
          permitCount: f._count.permits,
          latitude: f.latitude,
          longitude: f.longitude,
        },
      })),
    };
  }

  async getOperators(page = 1, limit = 20): Promise<PaginatedResponse<OperatorWithCounts>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              facilities: true,
              plants: true,
              permits: true,
              batches: true,
              sales: true,
            },
          },
          permits: {
            where: { status: 'active' },
            select: { id: true, permitType: true, expiryDate: true },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPermits(
    page = 1,
    limit = 20,
    status?: string,
    permitType?: string,
  ): Promise<PaginatedResponse<PermitWithRelations>> {
    const skip = (page - 1) * limit;
    const where: Prisma.PermitWhereInput = {};
    if (status) where.status = status;
    if (permitType) where.permitType = permitType;

    const [data, total] = await Promise.all([
      this.prisma.permit.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, tradingName: true } },
          facility: { select: { id: true, name: true, province: true } },
        },
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
      }),
      this.prisma.permit.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updatePermitStatus(id: string, status: string, notes?: string, actorId?: string, actorRole?: string) {
    const permit = await this.prisma.permit.findUnique({ where: { id } });
    if (!permit) throw new NotFoundException(`Permit ${id} not found`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.permit.update({
        where: { id },
        data: {
          status,
          conditions: notes ? `${permit.conditions ?? ''}\n[${new Date().toISOString()}] ${notes}`.trim() : permit.conditions,
        },
      });

      // Record audit event atomically (Section 4.1 — RC-014/015)
      await this.auditService.logInTx(tx, {
        entityType: 'permit',
        entityId: id,
        tenantId: permit.tenantId,
        action: `permit_status_${status}`,
        userId: actorId || 'system',
        userRole: actorRole || 'regulator',
        metadata: { previousStatus: permit.status, newStatus: status, notes },
      });

      return result;
    });

    return updated;
  }

  async getComplianceAlerts(page = 1, limit = 20): Promise<PaginatedResponse<ComplianceAlertItem>> {
    const skip = (page - 1) * limit;

    // Build compliance alerts from real data
    const alerts: ComplianceAlertItem[] = [];

    // 1. Expired permits
    const expiredPermits = await this.prisma.permit.findMany({
      where: { expiryDate: { lt: new Date() }, status: { not: 'expired' } },
      include: { tenant: { select: { name: true } }, facility: { select: { name: true } } },
    });
    for (const p of expiredPermits) {
      alerts.push({
        id: `expired-${p.id}`,
        severity: 'critical',
        type: 'expired_permit',
        description: `Permit ${p.permitNumber} has expired but status is still "${p.status}"`,
        operatorName: p.tenant.name,
        facilityName: p.facility.name,
        createdAt: p.expiryDate.toISOString(),
      });
    }

    // 2. Permits expiring within 30 days
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringPermits = await this.prisma.permit.findMany({
      where: { expiryDate: { gte: new Date(), lte: soon }, status: 'active' },
      include: { tenant: { select: { name: true } }, facility: { select: { name: true } } },
    });
    for (const p of expiringPermits) {
      alerts.push({
        id: `expiring-${p.id}`,
        severity: 'warning',
        type: 'permit_expiring',
        description: `Permit ${p.permitNumber} expires on ${p.expiryDate.toISOString().slice(0, 10)}`,
        operatorName: p.tenant.name,
        facilityName: p.facility.name,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Non-compliant operators
    const nonCompliant = await this.prisma.tenant.findMany({
      where: { complianceStatus: { not: 'compliant' } },
    });
    for (const t of nonCompliant) {
      alerts.push({
        id: `noncompliant-${t.id}`,
        severity: t.complianceStatus === 'non_compliant' ? 'critical' : 'warning',
        type: 'non_compliant_operator',
        description: `Operator "${t.name}" has compliance status: ${t.complianceStatus}`,
        operatorName: t.name,
        facilityName: '—',
        createdAt: t.updatedAt.toISOString(),
      });
    }

    // 4. Failed lab results
    const failedLabs = await this.prisma.labResult.findMany({
      where: {
        OR: [
          { pesticidesPass: false },
          { heavyMetalsPass: false },
          { microbialsPass: false },
          { mycotoxinsPass: false },
        ],
      },
      include: { batches: { select: { batchNumber: true, tenant: { select: { name: true } } } }, tenant: { select: { name: true } } },
    });
    for (const lr of failedLabs) {
      const failures: string[] = [];
      if (!lr.pesticidesPass) failures.push('pesticides');
      if (!lr.heavyMetalsPass) failures.push('heavy metals');
      if (!lr.microbialsPass) failures.push('microbials');
      if (!lr.mycotoxinsPass) failures.push('mycotoxins');
      const batchLabel = lr.batches[0]?.batchNumber ?? 'unknown batch';
      alerts.push({
        id: `labfail-${lr.id}`,
        severity: 'critical',
        type: 'lab_test_failure',
        description: `Batch ${batchLabel} failed: ${failures.join(', ')}`,
        operatorName: lr.tenant.name,
        facilityName: '—',
        createdAt: lr.testDate.toISOString(),
      });
    }

    // Sort by severity (critical first) then date
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

    const total = alerts.length;
    const paged = alerts.slice(skip, skip + limit);

    return {
      data: paged,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // =========================================================================
  // Section 7.4 — Regulatory Dashboard API Enhancements
  // =========================================================================

  /**
   * 7.4.1 — KPI endpoint with Redis caching (TTL 5 min).
   * Aggregates key metrics across the national system.
   */
  async getKpis(): Promise<RegulatoryKpis> {
    const cacheKey = 'regulatory:kpis';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [
      totalOperators,
      activeOperators,
      totalFacilities,
      activeFacilities,
      totalPlants,
      activePlants,
      activePermits,
      expiredPermits,
      totalBatches,
      pendingInspections,
      completedInspections,
      failedInspections,
      openAlerts,
      criticalAlerts,
      destructionEvents,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.facility.count(),
      this.prisma.facility.count({ where: { isActive: true } }),
      this.prisma.plant.count(),
      this.prisma.plant.count({ where: { state: { in: ['vegetative', 'flowering', 'harvested'] } } }),
      this.prisma.permit.count({ where: { status: 'active' } }),
      this.prisma.permit.count({ where: { expiryDate: { lt: new Date() } } }),
      this.prisma.batch.count(),
      this.prisma.inspection.count({ where: { status: 'scheduled' } }),
      this.prisma.inspection.count({ where: { status: 'completed' } }),
      this.prisma.inspection.count({ where: { overallOutcome: 'fail' } }),
      this.prisma.complianceAlert.count({ where: { status: 'open' } }),
      this.prisma.complianceAlert.count({ where: { severity: 'critical', status: 'open' } }),
      this.prisma.destructionEvent.count(),
    ]);

    const kpis = {
      operators: { total: totalOperators, active: activeOperators },
      facilities: { total: totalFacilities, active: activeFacilities },
      plants: { total: totalPlants, active: activePlants },
      permits: { active: activePermits, expired: expiredPermits },
      batches: { total: totalBatches },
      inspections: {
        pending: pendingInspections,
        completed: completedInspections,
        failed: failedInspections,
      },
      alerts: { open: openAlerts, critical: criticalAlerts },
      destruction: { total: destructionEvents },
      updatedAt: new Date().toISOString(),
    };

    await this.redis.set(cacheKey, JSON.stringify(kpis), 300); // 5 min TTL
    return kpis;
  }

  /**
   * 7.4.2 — Compliance overview summary.
   * Breakdown of alert statuses and severities.
   */
  async getComplianceOverview(): Promise<ComplianceOverview> {
    const [byStatus, bySeverity, recentAlerts] = await Promise.all([
      this.prisma.complianceAlert.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.complianceAlert.groupBy({
        by: ['severity'],
        _count: { id: true },
      }),
      this.prisma.complianceAlert.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          severity: true,
          alertType: true,
          description: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      statusBreakdown: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      severityBreakdown: bySeverity.map((s) => ({ severity: s.severity, count: s._count.id })),
      recentAlerts,
    };
  }

  /**
   * 7.4.3 — Alert summary with counts by type and severity.
   */
  async getAlertSummary(): Promise<AlertSummary> {
    const [byType, bySeverity, totalOpen, totalResolved] = await Promise.all([
      this.prisma.complianceAlert.groupBy({
        by: ['alertType'],
        where: { status: 'open' },
        _count: { id: true },
      }),
      this.prisma.complianceAlert.groupBy({
        by: ['severity'],
        where: { status: 'open' },
        _count: { id: true },
      }),
      this.prisma.complianceAlert.count({ where: { status: 'open' } }),
      this.prisma.complianceAlert.count({ where: { status: 'resolved' } }),
    ]);

    return {
      totalOpen,
      totalResolved,
      byType: byType.map((t) => ({ type: t.alertType, count: t._count.id })),
      bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count.id })),
    };
  }

  /**
   * 7.4.4 — Inspection calendar with upcoming/overdue inspections.
   */
  async getInspectionCalendar(
    from?: Date,
    to?: Date,
  ): Promise<InspectionCalendarItem[]> {
    const where: Prisma.InspectionWhereInput = {};
    if (from || to) {
      where.scheduledDate = {};
      if (from) where.scheduledDate.gte = from;
      if (to) where.scheduledDate.lte = to;
    }

    const inspections = await this.prisma.inspection.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      select: {
        id: true,
        type: true,
        priority: true,
        status: true,
        scheduledDate: true,
        inspectorId: true,
        facility: {
          select: { id: true, name: true, province: true },
        },
      },
    });

    return inspections;
  }

  /**
   * 7.4.5 — Production trends — monthly plant, harvest, and batch stats.
   */
  async getProductionTrends(months = 12): Promise<ProductionTrendEntry[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const [plants, harvests, batches, destructions] = await Promise.all([
      this.prisma.plant.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.harvest.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, wetWeightGrams: true, dryWeightGrams: true },
      }),
      this.prisma.batch.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.destructionEvent.findMany({
        where: { destructionDate: { gte: since } },
        select: { destructionDate: true, quantityKg: true },
      }),
    ]);

    const formatMonth = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const monthly: Record<string, {
      plants: number;
      harvests: number;
      harvestWeightKg: number;
      batches: number;
      destructionKg: number;
    }> = {};

    const ensure = (key: string) => {
      if (!monthly[key])
        monthly[key] = { plants: 0, harvests: 0, harvestWeightKg: 0, batches: 0, destructionKg: 0 };
    };

    for (const p of plants) { const k = formatMonth(p.createdAt); ensure(k); monthly[k]!.plants++; }
    for (const h of harvests) {
      const k = formatMonth(h.createdAt); ensure(k);
      monthly[k]!.harvests++;
      monthly[k]!.harvestWeightKg += (h.dryWeightGrams ?? h.wetWeightGrams) / 1000;
    }
    for (const b of batches) { const k = formatMonth(b.createdAt); ensure(k); monthly[k]!.batches++; }
    for (const d of destructions) {
      const k = formatMonth(d.destructionDate); ensure(k);
      monthly[k]!.destructionKg += d.quantityKg;
    }

    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values }));
  }

  /**
   * 7.4.6 — Geographic summary — province-level aggregation.
   */
  async getGeographicSummary(): Promise<GeographicSummaryEntry[]> {
    const facilities = await this.prisma.facility.findMany({
      where: { isActive: true },
      select: {
        province: true,
        _count: { select: { plants: true, inspections: true } },
      },
    });

    const provinces = new Map<string, { facilities: number; plants: number; inspections: number }>();
    for (const f of facilities) {
      const p = provinces.get(f.province) ?? { facilities: 0, plants: 0, inspections: 0 };
      p.facilities++;
      p.plants += f._count.plants;
      p.inspections += f._count.inspections;
      provinces.set(f.province, p);
    }

    return Array.from(provinces.entries()).map(([province, stats]) => ({
      province,
      ...stats,
    }));
  }

  /**
   * 7.4.7 — Operator drill-down — detailed stats for a single tenant.
   */
  async getOperatorDrillDown(tenantId: string): Promise<OperatorDrillDown> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        facilities: {
          select: {
            id: true,
            name: true,
            province: true,
            facilityType: true,
            _count: { select: { plants: true, inspections: true, destructionEvents: true } },
          },
        },
        permits: {
          select: {
            id: true,
            permitNumber: true,
            permitType: true,
            status: true,
            expiryDate: true,
          },
        },
        _count: {
          select: {
            plants: true,
            batches: true,
            harvests: true,
            sales: true,
            inspections: true,
            complianceAlerts: true,
            destructionEvents: true,
            importExportRecords: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    // Recent compliance alerts
    const recentAlerts = await this.prisma.complianceAlert.findMany({
      where: { tenantId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, severity: true, alertType: true, description: true, status: true, createdAt: true },
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        tradingName: tenant.tradingName,
        registrationNumber: tenant.registrationNumber,
        complianceStatus: tenant.complianceStatus,
        province: tenant.province,
        bbbeeLevel: tenant.bbbeeLevel,
      },
      facilities: tenant.facilities,
      permits: tenant.permits,
      counts: tenant._count,
      recentAlerts,
    };
  }

  /**
   * 7.4.8 — National summary — high-level stats for the entire system.
   */
  async getNationalSummary(): Promise<NationalSummary> {
    const cacheKey = 'regulatory:national-summary';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const [
      activeOperators,
      activeFacilities,
      activePlants,
      totalBatches,
      yearlySales,
      yearlyDestruction,
      openAlerts,
      pendingInspections,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.facility.count({ where: { isActive: true } }),
      this.prisma.plant.count({ where: { state: { in: ['vegetative', 'flowering'] } } }),
      this.prisma.batch.count(),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: yearStart } },
        _sum: { priceZar: true, quantityGrams: true },
        _count: true,
      }),
      this.prisma.destructionEvent.aggregate({
        where: { destructionDate: { gte: yearStart } },
        _sum: { quantityKg: true },
        _count: true,
      }),
      this.prisma.complianceAlert.count({ where: { status: 'open' } }),
      this.prisma.inspection.count({ where: { status: 'scheduled' } }),
    ]);

    const summary = {
      activeOperators,
      activeFacilities,
      activePlants,
      totalBatches,
      yearToDate: {
        salesCount: yearlySales._count,
        salesRevenueZar: yearlySales._sum.priceZar ?? 0,
        salesVolumeGrams: yearlySales._sum.quantityGrams ?? 0,
        destructionCount: yearlyDestruction._count,
        destructionKg: yearlyDestruction._sum.quantityKg ?? 0,
      },
      openAlerts,
      pendingInspections,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.set(cacheKey, JSON.stringify(summary), 300);
    return summary;
  }

  /**
   * 7.4.9 — Municipal summary — grouped by province.
   */
  async getMunicipalSummary(): Promise<MunicipalSummaryEntry[]> {
    const facilities = await this.prisma.facility.findMany({
      where: { isActive: true },
      select: {
        province: true,
        municipalLicenseNumber: true,
        municipalLicenseExpiry: true,
        _count: { select: { plants: true, inspections: true } },
      },
    });

    const byProvince = new Map<
      string,
      { facilities: number; licensed: number; expiredLicenses: number; plants: number }
    >();

    const now = new Date();
    for (const f of facilities) {
      const p = byProvince.get(f.province) ?? { facilities: 0, licensed: 0, expiredLicenses: 0, plants: 0 };
      p.facilities++;
      p.plants += f._count.plants;
      if (f.municipalLicenseNumber) p.licensed++;
      if (f.municipalLicenseExpiry && f.municipalLicenseExpiry < now) p.expiredLicenses++;
      byProvince.set(f.province, p);
    }

    return Array.from(byProvince.entries()).map(([province, stats]) => ({
      province,
      ...stats,
    }));
  }

  /**
   * 7.4.1 — Municipal drill-down for a specific municipality code / province.
   */
  async getMunicipalDrillDown(municipalityCode: string): Promise<MunicipalDrillDown> {
    const facilities = await this.prisma.facility.findMany({
      where: {
        isActive: true,
        province: { contains: municipalityCode, mode: 'insensitive' },
      },
      include: {
        tenant: { select: { id: true, name: true, tradingName: true } },
        _count: { select: { plants: true, inspections: true } },
      },
    });

    const now = new Date();
    return {
      municipalityCode,
      facilityCount: facilities.length,
      activeLicenses: facilities.filter((f) => !!f.municipalLicenseNumber).length,
      expiredLicenses: facilities.filter(
        (f) => f.municipalLicenseExpiry && f.municipalLicenseExpiry < now,
      ).length,
      totalPlants: facilities.reduce((sum, f) => sum + f._count.plants, 0),
      facilities: facilities.map((f) => ({
        id: f.id,
        name: f.name,
        tenant: f.tenant.tradingName || f.tenant.name,
        municipalLicense: f.municipalLicenseNumber ?? null,
        licenseExpiry: f.municipalLicenseExpiry?.toISOString() ?? null,
        plantCount: f._count.plants,
        inspectionCount: f._count.inspections,
      })),
    };
  }
}
