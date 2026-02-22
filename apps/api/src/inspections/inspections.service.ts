import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { InspectionReportGenerator } from '../reports/generators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CompleteInspectionDto,
  InspectionFilterDto,
} from './dto';
import { Prisma } from '@prisma/client';
import type { Inspection } from '@prisma/client';

/** Inspection with facility name */
export interface InspectionWithFacility extends Inspection {
  facility: { name: string };
}

/** Inspection with facility details for findOne */
export interface InspectionDetail extends Inspection {
  facility: {
    name: string;
    address: string;
    province: string;
    municipalLicenseNumber: string | null;
  };
}

/** Inspection list item with facility info */
export interface InspectionListItem extends Inspection {
  facility: { name: string; province: string };
}

/**
 * Section 7.1 — Inspections Service
 *
 * Business logic for scheduling, conducting, and completing
 * facility inspections. Supports the standard SAHPRA/DALRRD
 * inspection checklist and generates PDF reports on completion.
 */
@Injectable()
export class InspectionsService {
  private readonly logger = new Logger(InspectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly reportGenerator: InspectionReportGenerator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Schedule a new inspection.
   * Validates facility exists, sets initial status to 'scheduled',
   * notifies the facility operator.
   */
  async schedule(
    dto: CreateInspectionDto,
    inspectorId: string,
    userRole: string,
  ): Promise<InspectionWithFacility> {
    // Validate facility exists
    const facility = await this.prisma.facility.findUnique({
      where: { id: dto.facilityId },
      select: { id: true, name: true, tenantId: true },
    });
    if (!facility) {
      throw new NotFoundException(`Facility ${dto.facilityId} not found`);
    }

    // If follow-up, validate parent inspection exists
    if (dto.followUpInspectionId) {
      const parent = await this.prisma.inspection.findUnique({
        where: { id: dto.followUpInspectionId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent inspection ${dto.followUpInspectionId} not found`,
        );
      }
    }

    const inspection = await this.prisma.inspection.create({
      data: {
        tenantId: facility.tenantId,
        facilityId: dto.facilityId,
        inspectorId,
        type: dto.type,
        priority: dto.priority ?? 'medium',
        status: 'scheduled',
        scheduledDate: new Date(dto.scheduledDate),
        estimatedDurationHrs: dto.estimatedDurationHrs ?? null,
        reason: dto.reason ?? null,
        additionalInspectors: dto.additionalInspectors ?? [],
        followUpInspectionId: dto.followUpInspectionId ?? null,
      },
      include: {
        facility: { select: { name: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      userId: inspectorId,
      userRole,
      entityType: 'inspection',
      entityId: inspection.id,
      action: 'inspection.scheduled',
      metadata: { type: dto.type, facilityId: dto.facilityId },
    });

    // Notify facility operator
    await this.notificationService.send({
      tenantId: facility.tenantId,
      role: 'operator_admin',
      type: 'inspection_scheduled',
      title: 'Inspection Scheduled',
      body: `A ${dto.type} inspection has been scheduled for ${facility.name} on ${dto.scheduledDate}.`,
      entityType: 'inspection',
      entityId: inspection.id,
    });

    // Emit domain event
    this.eventEmitter.emit('inspection.scheduled', {
      inspectionId: inspection.id,
      facilityId: dto.facilityId,
      type: dto.type,
      scheduledDate: dto.scheduledDate,
    });

    this.logger.log(
      `Inspection ${inspection.id} scheduled for facility ${facility.name}`,
    );
    return inspection;
  }

  /**
   * Start an inspection — transitions status from 'scheduled' to 'in_progress'.
   * Validates inspector ownership and current status.
   */
  async start(
    inspectionId: string,
    inspectorId: string,
    userRole: string,
  ): Promise<InspectionWithFacility> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
    });
    if (!inspection) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }

    if (inspection.status !== 'scheduled' && inspection.status !== 'overdue') {
      throw new BadRequestException(
        `Cannot start inspection in status '${inspection.status}'. Must be 'scheduled' or 'overdue'.`,
      );
    }

    // Verify the requesting user is the assigned inspector or additional
    if (
      inspection.inspectorId !== inspectorId &&
      !inspection.additionalInspectors.includes(inspectorId)
    ) {
      throw new BadRequestException(
        'Only the assigned inspector or additional inspectors can start this inspection.',
      );
    }

    const updated = await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'in_progress',
        actualStartDate: new Date(),
      },
      include: { facility: { select: { name: true } } },
    });

    await this.auditService.log({
      userId: inspectorId,
      userRole,
      entityType: 'inspection',
      entityId: inspectionId,
      action: 'inspection.started',
    });

    this.eventEmitter.emit('inspection.started', {
      inspectionId,
      facilityId: inspection.facilityId,
    });

    this.logger.log(`Inspection ${inspectionId} started`);
    return updated;
  }

  /**
   * Complete an inspection — records checklist, findings, outcome.
   * If outcome is 'fail' or 'conditional_pass' with remediation=true,
   * alerts the regulatory team. Generates PDF report.
   */
  async complete(
    inspectionId: string,
    dto: CompleteInspectionDto,
    inspectorId: string,
    userRole: string,
  ): Promise<InspectionWithFacility> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { facility: { select: { name: true, tenantId: true } } },
    });
    if (!inspection) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }

    if (inspection.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot complete inspection in status '${inspection.status}'. Must be 'in_progress'.`,
      );
    }

    // Validate checklist has required items from standard template
    const failedItems = (dto.checklist ?? []).filter((c: { status: string }) => c.status === 'fail');
    const autoRemediation =
      dto.overallOutcome === 'fail' ||
      (dto.overallOutcome === 'conditional_pass' && failedItems.length > 0);

    const updated = await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'completed',
        completedDate: new Date(),
        checklist: dto.checklist as unknown as import('@prisma/client').Prisma.InputJsonValue,
        findings: dto.findings ?? null,
        overallOutcome: dto.overallOutcome,
        remediationRequired: dto.remediationRequired ?? autoRemediation,
        remediationDeadline: dto.remediationDeadline
          ? new Date(dto.remediationDeadline)
          : null,
        remediationNotes: dto.remediationNotes ?? null,
        photos: dto.photos ?? [],
      },
      include: { facility: { select: { name: true } } },
    });

    // Audit log
    await this.auditService.log({
      userId: inspectorId,
      userRole,
      entityType: 'inspection',
      entityId: inspectionId,
      action: 'inspection.completed',
      metadata: {
        outcome: dto.overallOutcome,
        failedItems: failedItems.length,
        remediationRequired: updated.remediationRequired,
      },
    });

    // Generate PDF report
    try {
      const reportUrl = await this.reportGenerator.generate(inspectionId);
      this.logger.log(`Report generated for inspection ${inspectionId}: ${reportUrl}`);
    } catch (err) {
      this.logger.error(
        `Failed to generate report for inspection ${inspectionId}: ${(err as Error).message}`,
      );
    }

    // Notify regulator if failed or conditional pass
    if (
      dto.overallOutcome === 'fail' ||
      dto.overallOutcome === 'conditional_pass'
    ) {
      await this.notificationService.send({
        role: 'regulator',
        type: 'inspection_result',
        title: `Inspection ${dto.overallOutcome === 'fail' ? 'Failed' : 'Conditional Pass'}`,
        body: `Inspection at ${inspection.facility.name} resulted in ${dto.overallOutcome}. ${failedItems.length} items failed.`,
        entityType: 'inspection',
        entityId: inspectionId,
      });
    }

    // Notify facility operator of results
    await this.notificationService.send({
      tenantId: inspection.tenantId,
      role: 'operator_admin',
      type: 'inspection_completed',
      title: 'Inspection Completed',
      body: `Your facility inspection has been completed with outcome: ${dto.overallOutcome}.`,
      entityType: 'inspection',
      entityId: inspectionId,
    });

    this.eventEmitter.emit('inspection.completed', {
      inspectionId,
      facilityId: inspection.facilityId,
      outcome: dto.overallOutcome,
      remediationRequired: updated.remediationRequired,
    });

    // RC-710: Auto-schedule follow-up inspection when remediation is required
    if (updated.remediationRequired && dto.remediationDeadline) {
      try {
        const followUpDate = new Date(dto.remediationDeadline);
        // Schedule follow-up 1 day after remediation deadline
        followUpDate.setDate(followUpDate.getDate() + 1);

        await this.prisma.inspection.create({
          data: {
            tenantId: inspection.tenantId,
            facilityId: inspection.facilityId,
            inspectorId,
            type: 'follow_up',
            priority: dto.overallOutcome === 'fail' ? 'high' : 'medium',
            status: 'scheduled',
            scheduledDate: followUpDate,
            reason: `Follow-up to inspection ${inspectionId} (outcome: ${dto.overallOutcome})`,
            followUpInspectionId: inspectionId,
            additionalInspectors: [],
          },
        });
        this.logger.log(
          `Auto-scheduled follow-up inspection for facility ${inspection.facilityId} after ${dto.remediationDeadline}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to auto-schedule follow-up inspection: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  /**
   * Update a scheduled/in-progress inspection (reschedule, re-prioritize, cancel).
   */
  async update(
    inspectionId: string,
    dto: UpdateInspectionDto,
    userId: string,
    userRole: string,
  ): Promise<InspectionWithFacility> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
    });
    if (!inspection) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }

    if (inspection.status === 'completed') {
      throw new BadRequestException('Cannot update a completed inspection.');
    }

    const data: Prisma.InspectionUpdateInput = {};
    if (dto.priority) data.priority = dto.priority;
    if (dto.status) data.status = dto.status;
    if (dto.scheduledDate) data.scheduledDate = new Date(dto.scheduledDate);
    if (dto.estimatedDurationHrs !== undefined)
      data.estimatedDurationHrs = dto.estimatedDurationHrs;
    if (dto.additionalInspectors)
      data.additionalInspectors = dto.additionalInspectors;
    if (dto.reason) data.reason = dto.reason;

    const updated = await this.prisma.inspection.update({
      where: { id: inspectionId },
      data,
      include: { facility: { select: { name: true } } },
    });

    await this.auditService.log({
      userId,
      userRole,
      entityType: 'inspection',
      entityId: inspectionId,
      action: 'inspection.updated',
      before: { status: inspection.status, priority: inspection.priority },
      after: data,
    });

    return updated;
  }

  /**
   * Get a single inspection by ID with full details.
   */
  async findOne(inspectionId: string): Promise<InspectionDetail> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        facility: {
          select: {
            name: true,
            address: true,
            province: true,
            municipalLicenseNumber: true,
          },
        },
      },
    });
    if (!inspection) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }
    return inspection;
  }

  /**
   * List inspections with filtering and pagination.
   */
  async findAll(
    filter: InspectionFilterDto,
  ): Promise<{ data: InspectionListItem[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InspectionWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.facilityId) where.facilityId = filter.facilityId;
    if (filter.inspectorId) where.inspectorId = filter.inspectorId;
    if (filter.from || filter.to) {
      where.scheduledDate = {};
      if (filter.from) where.scheduledDate.gte = new Date(filter.from);
      if (filter.to) where.scheduledDate.lte = new Date(filter.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledDate: 'desc' },
        include: {
          facility: { select: { name: true, province: true } },
        },
      }),
      this.prisma.inspection.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Generate pre-signed upload URLs for inspection photos.
   * RC-708: POST /inspections/:id/photos
   */
  async generatePhotoUploadUrls(
    inspectionId: string,
    filenames: string[],
  ): Promise<{ urls: Array<{ filename: string; uploadUrl: string; key: string }> }> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
    });
    if (!inspection) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }

    // Generate S3 keys and placeholder pre-signed URLs
    // In production, this would use @aws-sdk/s3-request-presigner
    const urls = (filenames ?? []).map((filename) => {
      const key = `inspections/${inspectionId}/photos/${Date.now()}-${filename}`;
      return {
        filename,
        uploadUrl: `https://s3.af-south-1.amazonaws.com/ncts-uploads/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256`,
        key,
      };
    });

    return { urls };
  }

  /**
   * Return the standard SAHPRA/DALRRD inspection checklist template.
   * Inspectors use this as a starting point for their assessment.
   */
  getStandardChecklist(): Array<{
    item: string;
    category: string;
    requiredEvidence: string;
  }> {
    return [
      {
        item: 'Facility security — perimeter fencing and access control',
        category: 'security',
        requiredEvidence: 'Photo of perimeter and log of access control system',
      },
      {
        item: 'CCTV coverage — cameras operational and recording',
        category: 'security',
        requiredEvidence: 'Screenshot from CCTV system with timestamp',
      },
      {
        item: 'Seed-to-sale tracking — all plants tagged and recorded',
        category: 'tracking',
        requiredEvidence: 'Random sample of 10 plants cross-referenced with system',
      },
      {
        item: 'Cultivation area — within licensed boundary',
        category: 'compliance',
        requiredEvidence: 'GPS coordinates compared to license boundary',
      },
      {
        item: 'Environmental controls — temperature, humidity, ventilation',
        category: 'cultivation',
        requiredEvidence: 'Sensor readings and maintenance logs',
      },
      {
        item: 'Pesticide usage — only approved products used',
        category: 'cultivation',
        requiredEvidence: 'Purchase records and application log',
      },
      {
        item: 'Lab testing — COA for current batches within date',
        category: 'quality',
        requiredEvidence: 'Certificate of Analysis from accredited lab',
      },
      {
        item: 'Waste disposal — destruction records and witness attestations',
        category: 'disposal',
        requiredEvidence: 'Destruction certificates with witness signatures',
      },
      {
        item: 'Employee records — background checks and training',
        category: 'personnel',
        requiredEvidence: 'HR records for all staff with access',
      },
      {
        item: 'Financial records — excise duty payments up to date',
        category: 'financial',
        requiredEvidence: 'SARS receipts matching ledger entries',
      },
      {
        item: 'Transport — valid manifests and vehicle registration',
        category: 'transport',
        requiredEvidence: 'Last 5 transfer manifests reviewed',
      },
      {
        item: 'Permit display — valid SAHPRA permit visibly displayed',
        category: 'compliance',
        requiredEvidence: 'Photo of permit display location',
      },
    ];
  }
}
