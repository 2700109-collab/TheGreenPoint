import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { PaginatedResponse } from '@ncts/shared-types';
import type { CreatePlantDto, BatchCreatePlantsDto, UpdatePlantStateDto, PlantFilterDto } from './dto';
import { PlantState } from '@ncts/shared-types';

/**
 * Valid plant state transitions.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  [PlantState.SEED]: [PlantState.SEEDLING, PlantState.DESTROYED],
  [PlantState.SEEDLING]: [PlantState.VEGETATIVE, PlantState.DESTROYED],
  [PlantState.VEGETATIVE]: [PlantState.FLOWERING, PlantState.DESTROYED],
  [PlantState.FLOWERING]: [PlantState.HARVESTED, PlantState.DESTROYED],
  [PlantState.HARVESTED]: [],
  [PlantState.DESTROYED]: [],
};

/** Generate NCTS tracking IDs: NCTS-ZA-{YEAR}-{SEQUENTIAL} */

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateTrackingId(): Promise<string> {
    const year = new Date().getFullYear();
    const lastPlant = await this.prisma.plant.findFirst({
      where: { trackingId: { startsWith: `NCTS-ZA-${year}` } },
      orderBy: { trackingId: 'desc' },
      select: { trackingId: true },
    });

    let seq = 1;
    if (lastPlant) {
      const parts = lastPlant.trackingId.split('-');
      seq = parseInt(parts[3] || '0', 10) + 1;
    }

    return `NCTS-ZA-${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(tenantId: string, dto: CreatePlantDto) {
    const trackingId = await this.generateTrackingId();

    return this.prisma.plant.create({
      data: {
        tenantId,
        trackingId,
        strainId: dto.strainId,
        facilityId: dto.facilityId,
        zoneId: dto.zoneId,
        plantedDate: dto.plantedDate ? new Date(dto.plantedDate) : new Date(),
        motherPlantId: dto.motherPlantId || null,
        state: PlantState.SEED,
      },
      include: {
        strain: { select: { id: true, name: true, type: true } },
        facility: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });
  }

  async batchCreate(tenantId: string, dto: BatchCreatePlantsDto) {
    const results = [];

    for (const plantDto of dto.plants) {
      const plant = await this.create(tenantId, plantDto);
      results.push(plant);
    }

    // Update zone current counts
    const zoneCounts = new Map<string, number>();
    for (const plantDto of dto.plants) {
      const current = zoneCounts.get(plantDto.zoneId) || 0;
      zoneCounts.set(plantDto.zoneId, current + 1);
    }

    for (const [zoneId, count] of zoneCounts) {
      await this.prisma.zone.update({
        where: { id: zoneId },
        data: { currentCount: { increment: count } },
      });
    }

    return {
      created: results.length,
      plants: results,
    };
  }

  async findAll(
    tenantId: string,
    filters: PlantFilterDto,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const { page = 1, limit = 20, state, strainId, facilityId, zoneId, plantedAfter, plantedBefore, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PlantWhereInput = { tenantId };
    if (state) where.state = state;
    if (strainId) where.strainId = strainId;
    if (facilityId) where.facilityId = facilityId;
    if (zoneId) where.zoneId = zoneId;
    if (plantedAfter || plantedBefore) {
      where.plantedDate = {};
      if (plantedAfter) where.plantedDate.gte = new Date(plantedAfter);
      if (plantedBefore) where.plantedDate.lte = new Date(plantedBefore);
    }

    const [data, total] = await Promise.all([
      this.prisma.plant.findMany({
        where,
        include: {
          strain: { select: { id: true, name: true, type: true } },
          facility: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.plant.count({ where }),
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

  async findAllForRegulator(filters: PlantFilterDto): Promise<PaginatedResponse<Record<string, unknown>>> {
    const { page = 1, limit = 20, state, strainId, facilityId, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PlantWhereInput = {};
    if (state) where.state = state;
    if (strainId) where.strainId = strainId;
    if (facilityId) where.facilityId = facilityId;

    const [data, total] = await Promise.all([
      this.prisma.plant.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, tradingName: true } },
          strain: { select: { id: true, name: true, type: true } },
          facility: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.plant.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId?: string) {
    const where = tenantId ? { id, tenantId } : { id };
    const plant = await this.prisma.plant.findFirst({
      where,
      include: {
        tenant: { select: { id: true, name: true, tradingName: true } },
        strain: true,
        facility: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        motherPlant: { select: { id: true, trackingId: true } },
        clones: { select: { id: true, trackingId: true, state: true } },
        batch: { select: { id: true, batchNumber: true } },
      },
    });

    if (!plant) {
      throw new NotFoundException(`Plant ${id} not found`);
    }

    return plant;
  }

  async updateState(id: string, tenantId: string, dto: UpdatePlantStateDto) {
    const plant = await this.findOne(id, tenantId);

    const currentState = plant.state;
    const validNext = VALID_TRANSITIONS[currentState] || [];

    if (!validNext.includes(dto.state)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentState} → ${dto.state}. ` +
        `Valid transitions: ${validNext.join(', ') || 'none (terminal state)'}`,
      );
    }

    const data: Prisma.PlantUpdateInput = { state: dto.state };

    if (dto.state === PlantState.HARVESTED) {
      data.harvestedDate = new Date();
    }
    if (dto.state === PlantState.DESTROYED) {
      data.destroyedDate = new Date();
      data.destroyedReason = dto.reason || 'No reason provided';
    }

    const updated = await this.prisma.plant.update({
      where: { id },
      data,
      include: {
        strain: { select: { id: true, name: true } },
        facility: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });

    // Update zone count if plant is destroyed/harvested (no longer active in zone)
    if ([PlantState.HARVESTED, PlantState.DESTROYED].includes(dto.state as PlantState)) {
      await this.prisma.zone.update({
        where: { id: plant.zoneId },
        data: { currentCount: { decrement: 1 } },
      });
    }

    return updated;
  }
}
