import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma, SuspiciousReport } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ProductVerificationDto } from '@ncts/shared-types';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Section 7.5 — Enhanced verification with scan logging and lab results.
   *
   * Logs each scan as an OutboxEvent for analytics and fraud detection.
   * Returns full lab test results including safety assessments.
   */
  async verify(
    trackingId: string,
    scanMetadata?: { ip?: string; userAgent?: string; latitude?: number; longitude?: number },
  ): Promise<ProductVerificationDto> {
    if (!trackingId.startsWith('NCTS-ZA-')) {
      throw new NotFoundException(
        `Invalid tracking ID format: ${trackingId}`,
      );
    }

    // Look up the plant by tracking ID
    const plant = await this.prisma.plant.findUnique({
      where: { trackingId },
      include: {
        strain: { select: { name: true, type: true } },
        batch: {
          include: {
            labResult: true,
            facility: { select: { name: true } },
          },
        },
        tenant: { select: { name: true, tradingName: true } },
        facility: { select: { name: true } },
      },
    });

    if (!plant) {
      throw new NotFoundException(`Product with tracking ID ${trackingId} not found`);
    }

    // Log scan event via OutboxEvent for analytics and fraud detection
    try {
      await this.prisma.outboxEvent.create({
        data: {
          eventType: 'verification.scanned',
          aggregateType: 'plant',
          aggregateId: plant.id,
          payload: {
            trackingId,
            scanTimestamp: new Date().toISOString(),
            ip: scanMetadata?.ip ?? null,
            userAgent: scanMetadata?.userAgent ?? null,
            location: scanMetadata?.latitude
              ? { lat: scanMetadata.latitude, lng: scanMetadata.longitude }
              : null,
          },
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to log scan event: ${(err as Error).message}`);
    }

    // Build chain of custody from transfer records related to this batch
    const chainOfCustody: { from: string; to: string; date: string }[] = [];

    if (plant.batch) {
      const transferItems = await this.prisma.transferItem.findMany({
        where: { batchId: plant.batch.id },
        include: {
          transfer: {
            select: {
              senderTenantId: true,
              receiverTenantId: true,
              status: true,
              initiatedAt: true,
              completedAt: true,
            },
          },
        },
      });

      for (const item of transferItems) {
        if (item.transfer.status === 'accepted' || item.transfer.status === 'pending') {
          const [sender, receiver] = await Promise.all([
            this.prisma.tenant.findUnique({
              where: { id: item.transfer.senderTenantId },
              select: { tradingName: true, name: true },
            }),
            this.prisma.tenant.findUnique({
              where: { id: item.transfer.receiverTenantId },
              select: { tradingName: true, name: true },
            }),
          ]);

          chainOfCustody.push({
            from: sender?.tradingName || sender?.name || 'Unknown',
            to: receiver?.tradingName || receiver?.name || 'Unknown',
            date: (item.transfer.completedAt ?? item.transfer.initiatedAt).toISOString().split('T')[0] as string,
          });
        }
      }
    }

    const operatorName = plant.tenant.tradingName || plant.tenant.name;
    const labResult = plant.batch?.labResult;

    // Emit scan event for real-time monitoring
    this.eventEmitter.emit('verification.scanned', {
      trackingId,
      plantId: plant.id,
      tenantId: plant.tenantId,
      ip: scanMetadata?.ip,
    });

    return {
      valid: true,
      trackingId,
      productName: `${plant.strain.name} (${plant.strain.type})`,
      strain: plant.strain.name,
      operatorName,
      batchNumber: plant.batch?.batchNumber ?? 'N/A',
      labResult: labResult
        ? {
            status: labResult.status,
            thcPercent: labResult.thcPercent,
            cbdPercent: labResult.cbdPercent,
            testDate: labResult.testDate.toISOString().split('T')[0] as string,
            labName: labResult.labName,
            // Section 7.5 — Enhanced lab safety results
            pesticidesPass: labResult.pesticidesPass,
            heavyMetalsPass: labResult.heavyMetalsPass,
            microbialsPass: labResult.microbialsPass,
            mycotoxinsPass: labResult.mycotoxinsPass,
          }
        : null,
      chainOfCustody,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Section 7.5 — Enhanced suspicious activity reporting.
   *
   * Creates a proper SuspiciousReport record (not just console.log),
   * captures IP and geolocation, and triggers investigator notifications.
   */
  async reportSuspicious(
    trackingId: string,
    reason: string,
    metadata?: {
      ip?: string;
      contact?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    // Create a proper SuspiciousReport record
    const report = await this.prisma.suspiciousReport.create({
      data: {
        trackingId,
        reason,
        reporterIp: metadata?.ip ?? null,
        reporterContact: metadata?.contact ?? null,
        reporterLocation: metadata?.latitude
          ? { lat: metadata.latitude, lng: metadata.longitude }
          : Prisma.JsonNull,
        investigationStatus: 'new',
      },
    });

    this.logger.warn(
      `Suspicious report ${report.id}: trackingId=${trackingId}, reason=${reason}`,
    );

    // Attempt to record in audit event log if the tracking ID exists
    try {
      const plant = await this.prisma.plant.findUnique({
        where: { trackingId },
        select: { id: true, tenantId: true },
      });

      if (plant) {
        await this.auditService.log({
          entityType: 'suspicious_report',
          entityId: report.id,
          action: 'suspicious_report.created',
          userId: 'public-consumer',
          userRole: 'consumer',
          tenantId: plant.tenantId,
          metadata: {
            trackingId,
            reason,
            reporterIp: metadata?.ip,
            reportedAt: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to create audit event for suspicious report: ${(err as Error).message}`,
      );
    }

    // Emit event for real-time alerting
    this.eventEmitter.emit('verification.suspicious', {
      reportId: report.id,
      trackingId,
      reason,
    });

    // Generate case reference: SUS-YYYY-NNN
    const year = new Date().getFullYear();
    const reportCount = await this.prisma.suspiciousReport.count();
    const caseReference = `SUS-${year}-${String(reportCount).padStart(3, '0')}`;

    return {
      success: true,
      reportId: report.id,
      caseReference,
      message: 'Report received. Thank you for helping keep our supply chain safe.',
    };
  }

  /**
   * Get scan history for a specific tracking ID (regulator/inspector use).
   */
  async getScanHistory(trackingId: string): Promise<{ id: string; payload: Prisma.JsonValue; createdAt: Date }[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        eventType: 'verification.scanned',
        payload: { path: ['trackingId'], equals: trackingId },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, payload: true, createdAt: true },
    });
    return events;
  }

  /**
   * Get suspicious reports for a tracking ID (regulator/inspector use).
   */
  async getSuspiciousReports(
    trackingId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: SuspiciousReport[]; total: number }> {
    const where: Prisma.SuspiciousReportWhereInput = {};
    if (trackingId) where.trackingId = trackingId;

    const [data, total] = await Promise.all([
      this.prisma.suspiciousReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.suspiciousReport.count({ where }),
    ]);

    return { data, total };
  }
}
