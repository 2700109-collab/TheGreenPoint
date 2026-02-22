import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { PaginatedResponse } from '@ncts/shared-types';
import type { CreateFacilityDto, UpdateFacilityDto } from './dto';
import type { Facility, Zone, Permit } from '@prisma/client';

/** Facility with zones for create/update responses */
interface FacilityWithZones extends Facility {
  zones: Zone[];
}

/** Facility list item with zones and counts */
interface FacilityListItem extends Facility {
  zones: Zone[];
  _count: { plants: number; permits: number };
}

/** Facility list item with tenant info for regulator view */
interface FacilityRegulatorItem extends Facility {
  tenant: { id: string; name: string; tradingName: string | null; complianceStatus: string | null };
  zones: Zone[];
  _count: { plants: number; permits: number };
}

/** Detailed facility with tenant, zones, permits, and counts */
interface FacilityDetail extends Facility {
  tenant: { id: string; name: string; tradingName: string | null };
  zones: Zone[];
  permits: Permit[];
  _count: { plants: number; harvests: number; batches: number; sales: number };
}

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateFacilityDto): Promise<FacilityWithZones> {
    return this.prisma.facility.create({
      data: {
        tenantId,
        name: dto.name,
        facilityType: dto.facilityType,
        province: dto.province,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        boundary: dto.boundary ? JSON.parse(JSON.stringify(dto.boundary)) : undefined,
      },
      include: { zones: true },
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<FacilityListItem>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.facility.findMany({
        where: { tenantId, isActive: true },
        include: {
          zones: true,
          _count: { select: { plants: true, permits: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.facility.count({ where: { tenantId, isActive: true } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<FacilityRegulatorItem>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.facility.findMany({
        include: {
          tenant: { select: { id: true, name: true, tradingName: true, complianceStatus: true } },
          zones: true,
          _count: { select: { plants: true, permits: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.facility.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId?: string): Promise<FacilityDetail> {
    const where = tenantId ? { id, tenantId } : { id };
    const facility = await this.prisma.facility.findFirst({
      where,
      include: {
        tenant: { select: { id: true, name: true, tradingName: true } },
        zones: true,
        permits: true,
        _count: { select: { plants: true, harvests: true, batches: true, sales: true } },
      },
    });

    if (!facility) {
      throw new NotFoundException(`Facility ${id} not found`);
    }

    return facility;
  }

  async update(id: string, tenantId: string, dto: UpdateFacilityDto): Promise<FacilityWithZones> {
    // Verify ownership
    await this.findOne(id, tenantId);

    return this.prisma.facility.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address && { address: dto.address }),
        ...(dto.boundary && { boundary: JSON.parse(JSON.stringify(dto.boundary)) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { zones: true },
    }) as unknown as FacilityWithZones;
  }

  async createZone(
    facilityId: string,
    tenantId: string,
    dto: { name: string; capacity: number },
  ) {
    // Verify facility ownership
    await this.findOne(facilityId, tenantId);

    return this.prisma.zone.create({
      data: {
        tenantId,
        facilityId,
        name: dto.name,
        capacity: dto.capacity,
      },
    });
  }

  async getZones(facilityId: string, tenantId?: string) {
    const where = tenantId
      ? { facilityId, tenantId }
      : { facilityId };

    return this.prisma.zone.findMany({
      where,
      include: {
        _count: { select: { plants: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
