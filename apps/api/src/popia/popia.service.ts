import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { KeyManager } from '../common/encryption/key-manager';
import { RecordConsentDto, DataDeletionRequestDto } from './dto';
import type { Consent } from '@prisma/client';

/** Shape returned by getDataInventory */
export interface DataInventory {
  userId: string;
  dataCategories: Array<{
    category: string;
    recordCount: number;
    retentionPeriod: string;
    legalBasis: string;
  }>;
  retentionPolicy: Record<string, number>;
  generatedAt: string;
}

/** Shape of consent type info in privacy policy */
export interface ConsentTypeInfo {
  type: string;
  description: string;
  required: boolean;
}

/** Shape returned by getPrivacyPolicy */
export interface PrivacyPolicy {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  consentTypes: ConsentTypeInfo[];
  dataRetentionPolicy: Record<string, number>;
  regulatoryFramework: string[];
  contactDetails: {
    informationOfficer: string;
    email: string;
    address: string;
  };
}

/**
 * Data retention policy — legal basis for keeping data despite deletion requests.
 */
const DATA_RETENTION_YEARS: Record<string, number> = {
  user_pii: 5,
  plant_tracking: 7,
  transfer_records: 7,
  lab_results: 7,
  audit_events: 10,
  financial_records: 7,
  inspection_records: 7,
  consent_records: 5,
  verification_scans: 2,
};

/**
 * Current privacy policy version.
 * In production this would be loaded from config or a database table.
 */
const CURRENT_POLICY_VERSION = '1.0.0';
const POLICY_EFFECTIVE_DATE = '2026-01-01';

/**
 * Section 8.2 — POPIA Compliance Service
 *
 * Implements the 8 POPIA conditions via:
 *   - Consent recording with policy version tracking
 *   - Subject Access Request (SAR) processing
 *   - Data deletion with anonymization (no physical delete)
 *   - Data inventory reporting
 *   - Privacy policy versioning
 */
@Injectable()
export class PopiaService {
  private readonly logger = new Logger(PopiaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly keyManager: KeyManager,
  ) {}

  // =========================================================================
  // Consent Management
  // =========================================================================

  /**
   * Record or update consent for a user.
   * Creates a new Consent record (not an update — maintains audit trail).
   */
  async recordConsent(
    userId: string,
    userRole: string,
    dto: RecordConsentDto,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<Consent> {
    const consent = await this.prisma.consent.create({
      data: {
        userId,
        consentType: dto.consentType,
        granted: dto.granted,
        policyVersion: dto.policyVersion,
        ipAddress: metadata?.ip ?? null,
        userAgent: metadata?.userAgent ?? null,
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      entityType: 'consent',
      entityId: consent.id,
      action: dto.granted ? 'consent.granted' : 'consent.denied',
      metadata: {
        consentType: dto.consentType,
        policyVersion: dto.policyVersion,
      },
    });

    this.logger.log(
      `Consent ${dto.granted ? 'granted' : 'denied'} for user ${userId}: ${dto.consentType}`,
    );
    return consent;
  }

  /**
   * Get a user's full consent history.
   */
  async getConsentHistory(userId: string): Promise<Consent[]> {
    return this.prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Withdraw a specific consent (sets withdrawnAt timestamp).
   */
  async withdrawConsent(
    consentId: string,
    userId: string,
    userRole: string,
  ): Promise<Consent> {
    const consent = await this.prisma.consent.findFirst({
      where: { id: consentId, userId },
    });
    if (!consent) {
      throw new NotFoundException(`Consent ${consentId} not found`);
    }
    if (consent.withdrawnAt) {
      throw new BadRequestException('Consent has already been withdrawn');
    }

    const updated = await this.prisma.consent.update({
      where: { id: consentId },
      data: { withdrawnAt: new Date() },
    });

    await this.auditService.log({
      userId,
      userRole,
      entityType: 'consent',
      entityId: consentId,
      action: 'consent.withdrawn',
      metadata: { consentType: consent.consentType },
    });

    this.logger.log(`Consent ${consentId} withdrawn by user ${userId}`);
    return updated;
  }

  // =========================================================================
  // Subject Access Request (SAR) — Data Export
  // =========================================================================

  /**
   * Request a personal data export (Subject Access Request).
   * POPIA requirement: must be fulfilled within 30 days (target: 48h).
   *
   * In production this would:
   *   1. Queue an async job to compile all user data
   *   2. Package as encrypted ZIP and upload to S3
   *   3. Notify user via email with a short-lived download link (24h)
   *
   * For now, we create an OutboxEvent to track the request and
   * compile a synchronous summary of what data we hold.
   */
  async requestDataExport(
    userId: string,
    userRole: string,
  ): Promise<{ requestId: string; estimatedCompletionHours: number; dataCategories: string[] }> {
    // Create outbox event for async job processing
    const event = await this.prisma.outboxEvent.create({
      data: {
        eventType: 'data_export.requested',
        aggregateType: 'user',
        aggregateId: userId,
        payload: {
          userId,
          requestedAt: new Date().toISOString(),
          status: 'pending',
        },
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      entityType: 'data_export',
      entityId: event.id,
      action: 'data_export.requested',
      metadata: { requestId: event.id },
    });

    this.logger.log(`Data export requested by user ${userId}: ${event.id}`);

    return {
      requestId: event.id,
      estimatedCompletionHours: 48,
      dataCategories: [
        'profile',
        'consents',
        'plants',
        'batches',
        'harvests',
        'sales',
        'lab_results',
        'transfers',
        'audit_events',
        'notifications',
      ],
    };
  }

  // =========================================================================
  // Data Deletion (Right to Erasure)
  // =========================================================================

  /**
   * Request data deletion/anonymization.
   *
   * POPIA + Regulatory compliance rules:
   *   - Cannot delete data required for regulatory compliance
   *   - Anonymize PII instead of physical deletion
   *   - Replace identifying information with 'REDACTED-{hash}'
   *   - Preserve non-PII for regulatory reporting
   */
  async requestDataDeletion(
    userId: string,
    userRole: string,
    dto: DataDeletionRequestDto,
  ): Promise<{
    requestId: string;
    scope: string;
    status: string;
    retainedCategories: string[];
    anonymizedCategories: string[];
  }> {
    // Regulatory data cannot be deleted — only anonymized
    const retainedCategories = [
      'plant_tracking (7 years — SA cannabis regulations)',
      'transfer_records (7 years — chain of custody)',
      'lab_results (7 years — product safety)',
      'financial_records (7 years — SARS requirements)',
      'audit_events (10 years — regulatory audit trail)',
      'inspection_records (7 years — regulatory compliance)',
    ];

    const anonymizedCategories: string[] = [];

    if (dto.scope === 'full' || dto.scope === 'marketing_only') {
      anonymizedCategories.push('marketing_preferences');
    }
    if (dto.scope === 'full' || dto.scope === 'analytics_only') {
      anonymizedCategories.push('analytics_data');
    }
    if (dto.scope === 'full') {
      anonymizedCategories.push('profile_pii');
      // Withdraw all active consents
      await this.prisma.consent.updateMany({
        where: { userId, withdrawnAt: null },
        data: { withdrawnAt: new Date() },
      });
    }

    // Create outbox event for async anonymization processing
    const event = await this.prisma.outboxEvent.create({
      data: {
        eventType: 'data_deletion.requested',
        aggregateType: 'user',
        aggregateId: userId,
        payload: {
          userId,
          scope: dto.scope,
          reason: dto.reason,
          requestedAt: new Date().toISOString(),
          status: 'pending',
        },
      },
    });

    await this.auditService.log({
      userId,
      userRole,
      entityType: 'data_deletion',
      entityId: event.id,
      action: 'data_deletion.requested',
      metadata: {
        scope: dto.scope,
        reason: dto.reason,
        retainedCategories: retainedCategories.length,
        anonymizedCategories,
      },
    });

    this.logger.log(
      `Data deletion requested by user ${userId}: scope=${dto.scope}, requestId=${event.id}`,
    );

    return {
      requestId: event.id,
      scope: dto.scope,
      status: 'pending',
      retainedCategories,
      anonymizedCategories,
    };
  }

  // =========================================================================
  // Data Inventory
  // =========================================================================

  /**
   * Return an inventory of what personal data we hold for a user.
   * Provides transparency (POPIA Condition 6: Openness).
   */
  async getDataInventory(userId: string): Promise<DataInventory> {
    // Count records across different data categories
    const [
      consentCount,
      notificationCount,
      auditEventCount,
    ] = await Promise.all([
      this.prisma.consent.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.auditEvent.count({ where: { actorId: userId } }),
    ]);

    return {
      userId: this.keyManager.pseudonymize(userId),
      dataCategories: [
        {
          category: 'consents',
          recordCount: consentCount,
          retentionPeriod: `${DATA_RETENTION_YEARS.consent_records} years`,
          legalBasis: 'POPIA Condition 2',
        },
        {
          category: 'notifications',
          recordCount: notificationCount,
          retentionPeriod: '1 year',
          legalBasis: 'Operational',
        },
        {
          category: 'audit_events',
          recordCount: auditEventCount,
          retentionPeriod: `${DATA_RETENTION_YEARS.audit_events} years`,
          legalBasis: 'Regulatory audit trail',
        },
      ],
      retentionPolicy: DATA_RETENTION_YEARS,
      generatedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Privacy Policy
  // =========================================================================

  /**
   * Return the current privacy policy version and metadata.
   */
  getPrivacyPolicy(): PrivacyPolicy {
    return {
      version: CURRENT_POLICY_VERSION,
      effectiveDate: POLICY_EFFECTIVE_DATE,
      lastUpdated: POLICY_EFFECTIVE_DATE,
      consentTypes: [
        {
          type: 'data_processing',
          description: 'Processing of personal data for providing cannabis tracking services',
          required: true,
        },
        {
          type: 'marketing',
          description: 'Receiving marketing communications about new features and offers',
          required: false,
        },
        {
          type: 'analytics',
          description: 'Collection of usage analytics to improve the platform',
          required: false,
        },
        {
          type: 'third_party_sharing',
          description: 'Sharing of aggregated data with regulatory partners',
          required: false,
        },
      ],
      dataRetentionPolicy: DATA_RETENTION_YEARS,
      regulatoryFramework: [
        'Protection of Personal Information Act (POPIA), 2013',
        'Cannabis for Private Purposes Act, 2024',
        'South African Health Products Regulatory Authority (SAHPRA)',
        'Department of Agriculture, Land Reform and Rural Development (DALRRD)',
      ],
      contactDetails: {
        informationOfficer: 'Data Protection Officer',
        email: 'privacy@greenpoint.co.za',
        address: 'Cape Town, South Africa',
      },
    };
  }
}
