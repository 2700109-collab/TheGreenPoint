import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateFacilityDto, UpdateFacilityDto, PaginatedResponse } from '@ncts/shared-types';

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateFacilityDto): Promise<any> {
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
  ): Promise<PaginatedResponse<any>> {
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

  async findAllForRegulator(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
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

  async findOne(id: string, tenantId?: string): Promise<any> {
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

  async update(id: string, tenantId: string, dto: UpdateFacilityDto): Promise<any> {
    // Verify ownership
    await this.findOne(id, tenantId);

    return this.prisma.facility.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address && { address: dto.address }),
        ...(dto.boundary && { boundary: dto.boundary }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { zones: true },
    });
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
