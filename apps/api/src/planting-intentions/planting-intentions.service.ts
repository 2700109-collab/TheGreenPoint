import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePlantingIntentionDto,
  UpdatePlantingIntentionDto,
  PlantingIntentionFilterDto,
} from './dto';
import { Prisma } from '@prisma/client';
import type { PlantingIntention } from '@prisma/client';

/** Planting intention with facility info */
interface PlantingIntentionWithFacility extends PlantingIntention {
  facility: { name: string; province: string };
}

/**
 * Section 8.3 — Planting Intention Service
 *
 * Operators submit seasonal planting plans with cultivar breakdown.
 * DALRRD-style: area in hectares, estimated yield per cultivar.
 * Government can review and acknowledge plans for national production forecasting.
 */
@Injectable()
export class PlantingIntentionsService {
  private readonly logger = new Logger(PlantingIntentionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new planting intention in draft status.
   */
  async create(
    tenantId: string,
    dto: CreatePlantingIntentionDto,
    userId: string,
    userRole: string,
  ): Promise<PlantingIntentionWithFacility> {
    // Validate facility belongs to tenant
    const facility = await this.prisma.facility.findFirst({
      where: { id: dto.facilityId, tenantId },
    });
    if (!facility) {
      throw new NotFoundException(`Facility ${dto.facilityId} not found`);
    }

    const intention = await this.prisma.plantingIntention.create({
      data: {
        tenantId,
        facilityId: dto.facilityId,
        season: dto.season,
        cultivars: dto.cultivars as unknown as import('@prisma/client').Prisma.InputJsonValue,
        totalAreaHa: dto.totalAreaHa,
        totalEstYieldKg: dto.totalEstYieldKg,
        plantingStart: new Date(dto.plantingStart),
        plantingEnd: new Date(dto.plantingEnd),
        status: 'draft',
      },
      include: {
        facility: { select: { name: true, province: true } },
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      tenantId,
      entityType: 'planting_intention',
      entityId: intention.id,
      action: 'planting_intention.created',
      metadata: {
        season: dto.season,
        facilityId: dto.facilityId,
        totalAreaHa: dto.totalAreaHa,
      },
    });

    this.logger.log(
      `Planting intention ${intention.id} created for season ${dto.season}`,
    );
    return intention;
  }

  /**
   * List planting intentions with filtering and pagination.
   * Regulators see all; operators see only their own tenant's.
   */
  async findAll(
    tenantId: string | null,
    filter: PlantingIntentionFilterDto,
  ): Promise<{ data: PlantingIntentionWithFacility[]; total: number; page: number; limit: number }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PlantingIntentionWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filter.season) where.season = filter.season;
    if (filter.status) where.status = filter.status;
    if (filter.facilityId) where.facilityId = filter.facilityId;

    const [data, total] = await Promise.all([
      this.prisma.plantingIntention.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          facility: { select: { name: true, province: true } },
        },
      }),
      this.prisma.plantingIntention.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Get a single planting intention by ID.
   * When tenantId is provided, scopes to that tenant (operators).
   * When null, returns any matching record (regulators/global roles).
   */
  async findOne(id: string, tenantId: string | null): Promise<PlantingIntentionWithFacility> {
    const where: Prisma.PlantingIntentionWhereInput = { id };
    if (tenantId) where.tenantId = tenantId;

    const intention = await this.prisma.plantingIntention.findFirst({
      where,
      include: {
        facility: { select: { name: true, province: true } },
      },
    });
    if (!intention) {
      throw new NotFoundException(`Planting intention ${id} not found`);
    }
    return intention;
  }

  /**
   * Update a draft planting intention.
   * Only 'draft' status intentions can be updated.
   */
  async update(
    id: string,
    tenantId: string,
    dto: UpdatePlantingIntentionDto,
    userId: string,
    userRole: string,
  ): Promise<PlantingIntentionWithFacility> {
    const intention = await this.prisma.plantingIntention.findFirst({
      where: { id, tenantId },
    });
    if (!intention) {
      throw new NotFoundException(`Planting intention ${id} not found`);
    }
    if (intention.status !== 'draft') {
      throw new BadRequestException(
        `Cannot update planting intention in status '${intention.status}'. Must be 'draft'.`,
      );
    }

    const data: Prisma.PlantingIntentionUpdateInput = {};
    if (dto.season) data.season = dto.season;
    if (dto.cultivars) data.cultivars = dto.cultivars as unknown as Prisma.InputJsonValue;
    if (dto.totalAreaHa !== undefined) data.totalAreaHa = dto.totalAreaHa;
    if (dto.totalEstYieldKg !== undefined) data.totalEstYieldKg = dto.totalEstYieldKg;
    if (dto.plantingStart) data.plantingStart = new Date(dto.plantingStart);
    if (dto.plantingEnd) data.plantingEnd = new Date(dto.plantingEnd);

    const updated = await this.prisma.plantingIntention.update({
      where: { id },
      data,
      include: {
        facility: { select: { name: true, province: true } },
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      tenantId,
      entityType: 'planting_intention',
      entityId: id,
      action: 'planting_intention.updated',
      before: { status: intention.status },
      after: data,
    });

    return updated;
  }

  /**
   * Submit a draft planting intention for acknowledgment.
   * Transitions status from 'draft' to 'submitted'.
   */
  async submit(
    id: string,
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<PlantingIntentionWithFacility> {
    const intention = await this.prisma.plantingIntention.findFirst({
      where: { id, tenantId },
    });
    if (!intention) {
      throw new NotFoundException(`Planting intention ${id} not found`);
    }
    if (intention.status !== 'draft') {
      throw new BadRequestException(
        `Cannot submit planting intention in status '${intention.status}'. Must be 'draft'.`,
      );
    }

    const updated = await this.prisma.plantingIntention.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
      include: {
        facility: { select: { name: true, province: true } },
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      tenantId,
      entityType: 'planting_intention',
      entityId: id,
      action: 'planting_intention.submitted',
      metadata: { season: intention.season },
    });

    this.logger.log(
      `Planting intention ${id} submitted for season ${intention.season}`,
    );
    return updated;
  }

  /**
   * Acknowledge a submitted planting intention (regulator action).
   * Transitions status from 'submitted' to 'acknowledged'.
   */
  async acknowledge(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<PlantingIntentionWithFacility> {
    const intention = await this.prisma.plantingIntention.findUnique({
      where: { id },
    });
    if (!intention) {
      throw new NotFoundException(`Planting intention ${id} not found`);
    }
    if (intention.status !== 'submitted') {
      throw new BadRequestException(
        `Cannot acknowledge planting intention in status '${intention.status}'. Must be 'submitted'.`,
      );
    }

    const updated = await this.prisma.plantingIntention.update({
      where: { id },
      data: { status: 'acknowledged' },
      include: {
        facility: { select: { name: true, province: true } },
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      tenantId: intention.tenantId,
      entityType: 'planting_intention',
      entityId: id,
      action: 'planting_intention.acknowledged',
      metadata: { season: intention.season },
    });

    this.logger.log(
      `Planting intention ${id} acknowledged for season ${intention.season}`,
    );
    return updated;
  }
}
