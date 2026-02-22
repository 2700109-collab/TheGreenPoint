import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { DestructionCertificateGenerator } from '../reports/generators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateDestructionDto, DestructionFilterDto } from './dto';
import { Prisma } from '@prisma/client';
import type { DestructionEvent } from '@prisma/client';

/** Destruction event with facility name */
interface DestructionEventWithFacility extends DestructionEvent {
  facility: { name: string };
}

/** Destruction event with facility details */
interface DestructionEventDetail extends DestructionEvent {
  facility: { name: string; address: string; province: string };
}

/** Destruction event list item */
interface DestructionEventListItem extends DestructionEvent {
  facility: { name: string };
}

/**
 * Section 7.2 — Destruction & Disposal Service
 *
 * Manages the destruction of cannabis plants and batches with
 * proper witness attestation, regulatory notification, and
 * certificate generation.
 *
 * Business Rules:
 *   - Minimum 2 witnesses required, at least one from SAPS or SAHPRA
 *   - Entities must exist and be in a valid state for destruction
 *   - Quantities > 10 kg automatically notify regulator
 *   - PDF destruction certificate generated on completion
 *   - Plants set to 'destroyed' state; batches remain for traceability
 */
@Injectable()
export class DestructionService {
  private readonly logger = new Logger(DestructionService.name);

  private static readonly OFFICIAL_ORGS = ['saps', 'sahpra', 'dalrrd'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly certificateGenerator: DestructionCertificateGenerator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a destruction event — validate entities, witnesses, and record.
   */
  async create(
    dto: CreateDestructionDto,
    userId: string,
    userRole: string,
    tenantId: string,
  ): Promise<DestructionEventWithFacility> {
    // Validate facility belongs to tenant
    const facility = await this.prisma.facility.findFirst({
      where: { id: dto.facilityId, tenantId },
      select: { id: true, name: true, tenantId: true },
    });
    if (!facility) {
      throw new NotFoundException(
        `Facility ${dto.facilityId} not found or does not belong to tenant`,
      );
    }

    // Validate at least one witness is from an official organization
    const hasOfficialWitness = dto.witnessOrganizations.some((org: string) =>
      DestructionService.OFFICIAL_ORGS.includes(org.toLowerCase()),
    );
    if (!hasOfficialWitness) {
      throw new BadRequestException(
        'At least one witness must be from SAPS, SAHPRA, or DALRRD.',
      );
    }

    // Validate witness arrays are consistent length
    if (
      dto.witnessNames.length !== dto.witnessOrganizations.length ||
      dto.witnessNames.length !== dto.witnessSignatures.length
    ) {
      throw new BadRequestException(
        'witnessNames, witnessOrganizations, and witnessSignatures must have the same length.',
      );
    }

    // Validate entities exist
    if (dto.entityType === 'plant') {
      const plants = await this.prisma.plant.findMany({
        where: { id: { in: dto.entityIds }, tenantId },
        select: { id: true, state: true },
      });
      if (plants.length !== dto.entityIds.length) {
        throw new BadRequestException(
          `Some plant IDs not found. Found ${plants.length} of ${dto.entityIds.length}.`,
        );
      }
      const alreadyDestroyed = plants.filter((p) => p.state === 'destroyed');
      if (alreadyDestroyed.length > 0) {
        throw new BadRequestException(
          `${alreadyDestroyed.length} plant(s) are already in 'destroyed' state.`,
        );
      }
    } else {
      const batches = await this.prisma.batch.findMany({
        where: { id: { in: dto.entityIds }, tenantId },
        select: { id: true },
      });
      if (batches.length !== dto.entityIds.length) {
        throw new BadRequestException(
          `Some batch IDs not found. Found ${batches.length} of ${dto.entityIds.length}.`,
        );
      }
    }

    // Create destruction event in a transaction
    const event = await this.prisma.$transaction(async (tx) => {
      const destruction = await tx.destructionEvent.create({
        data: {
          tenantId,
          facilityId: dto.facilityId,
          entityType: dto.entityType,
          entityIds: dto.entityIds,
          quantityKg: dto.quantityKg,
          destructionMethod: dto.destructionMethod,
          destructionDate: new Date(dto.destructionDate),
          witnessNames: dto.witnessNames,
          witnessOrganizations: dto.witnessOrganizations,
          witnessSignatures: dto.witnessSignatures,
          reason: dto.reason,
          photos: dto.photos ?? [],
          videoUrl: dto.videoUrl ?? null,
          approvedBy: userId,
        },
        include: { facility: { select: { name: true } } },
      });

      // Update plant states to 'destroyed'
      if (dto.entityType === 'plant') {
        await tx.plant.updateMany({
          where: { id: { in: dto.entityIds } },
          data: { state: 'destroyed' },
        });
      }

      // Audit within transaction
      await this.auditService.logInTx(tx, {
        userId,
        userRole,
        entityType: 'destruction_event',
        entityId: destruction.id,
        action: 'destruction.created',
        metadata: {
          entityType: dto.entityType,
          entityCount: dto.entityIds.length,
          quantityKg: dto.quantityKg,
          method: dto.destructionMethod,
          witnessOrgs: dto.witnessOrganizations,
        },
      });

      return destruction;
    });

    // Auto-notify regulator for quantities > 10kg
    const shouldNotifyRegulator = dto.quantityKg > 10;
    if (shouldNotifyRegulator) {
      await this.notificationService.send({
        role: 'regulator',
        type: 'destruction_large_quantity',
        title: 'Large Destruction Event',
        body: `${dto.quantityKg} kg of ${dto.entityType}(s) destroyed at ${facility.name} via ${dto.destructionMethod}. Reason: ${dto.reason}.`,
        entityType: 'destruction_event',
        entityId: event.id,
      });

      await this.prisma.destructionEvent.update({
        where: { id: event.id },
        data: {
          regulatoryNotified: true,
          regulatoryNotifiedAt: new Date(),
        },
      });
    }

    // Generate destruction certificate
    try {
      await this.certificateGenerator.generate(event.id);
      this.logger.log(`Destruction certificate generated for event ${event.id}`);
    } catch (err) {
      this.logger.error(
        `Failed to generate destruction certificate: ${(err as Error).message}`,
      );
    }

    this.eventEmitter.emit('destruction.created', {
      destructionEventId: event.id,
      entityType: dto.entityType,
      entityIds: dto.entityIds,
      quantityKg: dto.quantityKg,
      facilityId: dto.facilityId,
    });

    this.logger.log(
      `Destruction event ${event.id}: ${dto.entityIds.length} ${dto.entityType}(s), ${dto.quantityKg} kg`,
    );
    return event;
  }

  /**
   * Get a single destruction event by ID.
   */
  async findOne(destructionId: string): Promise<DestructionEventDetail> {
    const event = await this.prisma.destructionEvent.findUnique({
      where: { id: destructionId },
      include: {
        facility: { select: { name: true, address: true, province: true } },
      },
    });
    if (!event) {
      throw new NotFoundException(`Destruction event ${destructionId} not found`);
    }
    return event;
  }

  /**
   * List destruction events with filtering and pagination.
   */
  async findAll(
    filter: DestructionFilterDto,
    tenantId?: string,
  ): Promise<{ data: DestructionEventListItem[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DestructionEventWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.destructionMethod)
      where.destructionMethod = filter.destructionMethod;
    if (filter.facilityId) where.facilityId = filter.facilityId;
    if (filter.from || filter.to) {
      where.destructionDate = {};
      if (filter.from) where.destructionDate.gte = new Date(filter.from);
      if (filter.to) where.destructionDate.lte = new Date(filter.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.destructionEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { destructionDate: 'desc' },
        include: {
          facility: { select: { name: true } },
        },
      }),
      this.prisma.destructionEvent.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Regulatory approval of a destruction event — updates regulatoryNotified flag.
   */
  async approve(
    destructionId: string,
    userId: string,
    userRole: string,
    notes?: string,
  ): Promise<DestructionEventWithFacility> {
    const event = await this.prisma.destructionEvent.findUnique({
      where: { id: destructionId },
    });
    if (!event) {
      throw new NotFoundException(`Destruction event ${destructionId} not found`);
    }

    const updated = await this.prisma.destructionEvent.update({
      where: { id: destructionId },
      data: {
        regulatoryNotified: true,
        regulatoryNotifiedAt: new Date(),
      },
      include: { facility: { select: { name: true } } },
    });

    await this.auditService.log({
      userId,
      userRole,
      entityType: 'destruction_event',
      entityId: destructionId,
      action: 'destruction.approved',
      metadata: { notes },
    });

    // Notify tenant that destruction was approved
    await this.notificationService.send({
      tenantId: event.tenantId,
      role: 'operator_admin',
      type: 'destruction_approved',
      title: 'Destruction Event Approved',
      body: `Your destruction event has been reviewed and approved by the regulator.`,
      entityType: 'destruction_event',
      entityId: destructionId,
    });

    return updated;
  }
}
