import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { RegulatoryDashboardDto, PaginatedResponse } from '@ncts/shared-types';

@Injectable()
export class RegulatoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<RegulatoryDashboardDto> {
    const [
      totalOperators,
      totalPlants,
      totalFacilities,
      activePermits,
      totalTenants,
      nonCompliantCount,
      recentAuditEvents,
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
      pendingInspections: 0, // TODO: inspection model not yet in schema
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

  async getOperators(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
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
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;
    const where: any = {};
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

  async updatePermitStatus(id: string, status: string, notes?: string) {
    const permit = await this.prisma.permit.findUnique({ where: { id } });
    if (!permit) throw new NotFoundException(`Permit ${id} not found`);

    const updated = await this.prisma.permit.update({
      where: { id },
      data: {
        status,
        conditions: notes ? `${permit.conditions ?? ''}\n[${new Date().toISOString()}] ${notes}`.trim() : permit.conditions,
      },
    });

    // Record audit event
    await this.prisma.auditEvent.create({
      data: {
        entityType: 'permit',
        entityId: id,
        tenantId: permit.tenantId,
        action: `permit_status_${status}`,
        actorId: 'system', // TODO: extract from JWT
        actorRole: 'regulator',
        previousHash: '',
        eventHash: '',
        payload: { previousStatus: permit.status, newStatus: status, notes },
      },
    });

    return updated;
  }

  async getComplianceAlerts(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    // Build compliance alerts from real data
    const alerts: any[] = [];

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
}
