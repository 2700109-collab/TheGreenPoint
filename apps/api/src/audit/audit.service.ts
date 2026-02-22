import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { computeEventHash, GENESIS_HASH } from '@ncts/audit-lib';
import { randomUUID } from 'crypto';

export interface AuditLogInput {
  tenantId?: string | null;
  userId: string;
  userRole?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

/** Shape of a single audit event returned by the query endpoint. */
export interface AuditEventRow {
  id: string;
  sequenceNumber: number;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorRole: string;
  tenantId: string | null;
  payload: unknown;
  before?: unknown;
  after?: unknown;
  eventHash: string;
  verified: boolean;
  ipAddress: string | null;
  createdAt: Date;
}

/** Broken link descriptor returned by the verify endpoint. */
export interface BrokenLink {
  eventId: string;
  position: number;
  expectedHash: string;
  actualHash: string;
}

/**
 * Section 4.1 — Centralized Audit Service
 *
 * Single entry point for all audit event creation.
 * Ensures consistent hash-chaining, field population, and tamper-evidence.
 *
 * Usage:
 *   - `log(input)` — standalone audit event
 *   - `logInTx(tx, input)` — within an existing Prisma `$transaction`
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit event with proper hash-chaining.
   * Standalone (not inside an existing transaction).
   *
   * Errors are logged and **re-thrown** so callers can decide whether to
   * tolerate a missing audit record (e.g. the global interceptor) or treat
   * it as fatal (e.g. a compliance-critical flow).
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.createEvent(this.prisma, input);
    } catch (error) {
      this.logger.error(
        `AUDIT FAILURE — action=${input.action} entity=${input.entityType}/${input.entityId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Create an audit event inside an existing Prisma transaction.
   * Errors propagate and will abort the transaction — use this when the
   * audit record **must** succeed together with the domain operation.
   */
  async logInTx(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    input: AuditLogInput,
  ): Promise<void> {
    await this.createEvent(tx, input);
  }

  /**
   * Verify the hash chain for a tenant within an optional date range.
   * Section 4.2 — Chain Verification
   */
  async verifyChain(params: {
    tenantId?: string;
    from?: Date;
    to?: Date;
  }): Promise<{
    verified: boolean;
    totalEvents: number;
    firstEvent?: string;
    lastEvent?: string;
    brokenLinks: BrokenLink[];
    verificationTime: string;
  }> {
    const startTime = Date.now();

    const where: Prisma.AuditEventWhereInput = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const events = await this.prisma.auditEvent.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        actorId: true,
        payload: true,
        previousHash: true,
        eventHash: true,
        createdAt: true,
      },
    });

    if (events.length === 0) {
      return {
        verified: true,
        totalEvents: 0,
        brokenLinks: [],
        verificationTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      };
    }

    // Full-scan verification — report ALL broken links, not just the first
    const brokenLinks: BrokenLink[] = [];

    for (let i = 0; i < events.length; i++) {
      const e = events[i]!;

      // 1. Recompute hash and compare
      const expectedHash = computeEventHash({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        action: e.action,
        actorId: e.actorId,
        payload: e.payload as Record<string, unknown>,
        previousHash: e.previousHash,
        createdAt: e.createdAt.toISOString(),
      });

      if (expectedHash !== e.eventHash) {
        brokenLinks.push({
          eventId: e.id,
          position: i,
          expectedHash,
          actualHash: e.eventHash,
        });
        continue; // still check remaining events
      }

      // 2. Verify chain linkage (previousHash matches prior event's eventHash)
      if (i > 0) {
        const prevEvent = events[i - 1]!;
        if (e.previousHash !== prevEvent.eventHash) {
          brokenLinks.push({
            eventId: e.id,
            position: i,
            expectedHash: prevEvent.eventHash,
            actualHash: e.previousHash,
          });
        }
      }
    }

    return {
      verified: brokenLinks.length === 0,
      totalEvents: events.length,
      firstEvent: events[0]!.createdAt.toISOString(),
      lastEvent: events[events.length - 1]!.createdAt.toISOString(),
      brokenLinks,
      verificationTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    };
  }

  /**
   * Query audit events with filtering and pagination.
   * Section 4.3 — Audit Query
   */
  async query(params: {
    tenantId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AuditEventRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const where: Prisma.AuditEventWhereInput = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.action) where.action = { contains: params.action };
    if (params.actorId) where.actorId = params.actorId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { sequenceNumber: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    // Inline chain verification for each returned event
    const data = events.map(e => {
      const expected = computeEventHash({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        action: e.action,
        actorId: e.actorId,
        payload: e.payload as Record<string, unknown>,
        previousHash: e.previousHash,
        createdAt: e.createdAt.toISOString(),
      });

      return {
        id: e.id,
        sequenceNumber: e.sequenceNumber,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        actorId: e.actorId,
        actorRole: e.actorRole,
        tenantId: e.tenantId,
        payload: e.payload,
        before: (e.payload as Record<string, unknown>)?.before,
        after: (e.payload as Record<string, unknown>)?.after,
        eventHash: e.eventHash,
        verified: expected === e.eventHash,
        ipAddress: e.ipAddress,
        createdAt: e.createdAt,
      };
    });

    return { data, total, page, limit };
  }

  /**
   * Export audit events as CSV.
   * Section 4.3 — Audit Export
   */
  async exportCsv(params: {
    tenantId?: string;
    from?: Date;
    to?: Date;
  }): Promise<string> {
    const where: Prisma.AuditEventWhereInput = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const events = await this.prisma.auditEvent.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
    });

    const header = 'id,sequenceNumber,action,entityType,entityId,actorId,actorRole,tenantId,ipAddress,createdAt,eventHash,previousHash';
    const rows = events.map(e =>
      [
        this.csvEscape(e.id),
        e.sequenceNumber,
        this.csvEscape(e.action),
        this.csvEscape(e.entityType),
        this.csvEscape(e.entityId),
        this.csvEscape(e.actorId),
        this.csvEscape(e.actorRole),
        this.csvEscape(e.tenantId || ''),
        this.csvEscape(e.ipAddress || ''),
        e.createdAt.toISOString(),
        e.eventHash,
        e.previousHash,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  // ─── Private Implementation ──────────────────────────────────────

  private async createEvent(
    client: Pick<PrismaService, 'auditEvent'>,
    input: AuditLogInput,
  ): Promise<void> {
    const eventId = randomUUID();
    const createdAt = new Date();

    // RC-009: Scope chain to tenant when tenantId is provided for consistency with verify endpoint
    const chainWhere: Prisma.AuditEventFindFirstArgs = {
      orderBy: { sequenceNumber: 'desc' as const },
      select: { eventHash: true },
    };
    if (input.tenantId) {
      chainWhere.where = { tenantId: input.tenantId };
    }
    const previousEvent = await client.auditEvent.findFirst(chainWhere);
    const previousHash = previousEvent?.eventHash || GENESIS_HASH;

    const payloadObj: Record<string, unknown> = {
      ...input.metadata,
    };
    if (input.before) payloadObj.before = input.before;
    if (input.after) payloadObj.after = input.after;
    const payload = payloadObj as Prisma.InputJsonValue;

    const eventHash = computeEventHash({
      id: eventId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.userId,
      payload: payloadObj as Record<string, unknown>,
      previousHash,
      createdAt: createdAt.toISOString(),
    });

    await client.auditEvent.create({
      data: {
        id: eventId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorId: input.userId,
        actorRole: input.userRole || 'system',
        tenantId: input.tenantId || null,
        payload,
        previousHash,
        eventHash,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        gpsLatitude: input.gpsLatitude ?? null,
        gpsLongitude: input.gpsLongitude ?? null,
        createdAt,
      },
    });
  }

  /** RFC 4180-compliant CSV field escaping. */
  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
