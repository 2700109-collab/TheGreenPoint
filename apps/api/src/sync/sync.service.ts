import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Prisma interactive-transaction client type */
type TransactionClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/** A serialized record for sync responses */
type SyncRecord = Record<string, unknown>;

/** An entity that has an updatedAt timestamp */
interface SyncEntity {
  id: string;
  updatedAt: Date;
  createdAt: Date;
  [key: string]: unknown;
}

/** Reference data returned for offline mobile caching */
interface ReferenceData {
  cultivars: { id: string; name: string; type: string; thcRange: string | null; cbdRange: string | null }[];
  zones: { id: string; facilityId: string; name: string; capacity: number | null; currentCount: number }[];
  exciseRates: { id: string; productCategory: string; ratePerUnit: unknown; unit: string }[];
  facilities: { id: string; name: string; facilityType: string; province: string | null }[];
  provinces: string[];
  facilityTypes: string[];
  plantStates: string[];
  batchTypes: string[];
  saleTypes: string[];
  syncedAt: string;
}

/**
 * Section 7.7 — Mobile Sync Service
 *
 * Implements WatermelonDB-compatible sync protocol:
 *   - pull: Returns changes since lastPulledAt for the client's tenant
 *   - push: Receives offline changes from the client, applies with conflict resolution
 *   - referenceData: Returns static/slow-changing lookup data
 *
 * Sync Tables and Conflict Resolution Strategies (per spec):
 *   - plants:      server-wins        (regulatory data — server is authoritative)
 *   - batches:     server-wins        (tracking IDs must remain consistent)
 *   - harvests:    last-write-wins    (field data entry — most recent is likely correct)
 *   - inspections: merge-fields       (inspector adds notes offline, server adds status)
 *   - sales:       reject-if-conflict (financial records cannot auto-merge)
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  /** Tables available for sync and their conflict strategy per spec */
  private static readonly SYNC_TABLES: Record<
    string,
    'server_wins' | 'last_write_wins' | 'merge_fields' | 'reject_if_conflict'
  > = {
    plants: 'server_wins',
    batches: 'server_wins',
    harvests: 'last_write_wins',
    inspections: 'merge_fields',
    sales: 'reject_if_conflict',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Pull changes since lastPulledAt for a tenant.
   * Returns WatermelonDB-format response:
   *   { changes: { table: { created: [], updated: [], deleted: [] } }, timestamp }
   */
  async pull(
    tenantId: string,
    lastPulledAt?: string,
    tables?: string[],
  ): Promise<{
    changes: Record<string, { created: SyncRecord[]; updated: SyncRecord[]; deleted: string[] }>;
    timestamp: string;
  }> {
    const since = lastPulledAt ? new Date(lastPulledAt) : new Date(0);
    const now = new Date();
    const requestedTables = tables?.length
      ? tables.filter((t) => t in SyncService.SYNC_TABLES)
      : Object.keys(SyncService.SYNC_TABLES);

    const changes: Record<
      string,
      { created: SyncRecord[]; updated: SyncRecord[]; deleted: string[] }
    > = {};

    for (const table of requestedTables) {
      changes[table] = await this.pullTable(table, tenantId, since);
    }

    return { changes, timestamp: now.toISOString() };
  }

  /**
   * Push offline changes from the client.
   * All operations wrapped in a Prisma transaction (spec acceptance criteria).
   * Applies conflict resolution per table strategy.
   */
  async push(
    tenantId: string,
    userId: string,
    userRole: string,
    pushData: {
      changes: Record<
        string,
        { created: Array<{ id: string; record: Record<string, unknown> }>; updated: Array<{ id: string; record: Record<string, unknown> }>; deleted: string[] }
      >;
      lastPulledAt?: string;
    },
  ): Promise<{ applied: number; conflicts: number; errors: string[] }> {
    let applied = 0;
    let conflicts = 0;
    const errors: string[] = [];
    const lastPulled = pushData.lastPulledAt ? new Date(pushData.lastPulledAt) : null;

    await this.prisma.$transaction(async (tx) => {
      for (const [table, tableChanges] of Object.entries(pushData.changes)) {
        if (!(table in SyncService.SYNC_TABLES)) {
          errors.push(`Unknown sync table: ${table}`);
          continue;
        }

        const strategy = SyncService.SYNC_TABLES[table] ?? 'server_wins';

        // Process creates
        for (const item of tableChanges.created ?? []) {
          try {
            await this.applyCreate(tx, table, tenantId, item.id, item.record);
            applied++;
          } catch (err) {
            errors.push(`Create ${table}/${item.id}: ${(err as Error).message}`);
          }
        }

        // Process updates with conflict resolution
        for (const item of tableChanges.updated ?? []) {
          try {
            const result = await this.applyUpdate(
              tx,
              table,
              tenantId,
              item.id,
              item.record,
              strategy,
              lastPulled,
            );
            if (result === 'conflict') conflicts++;
            else applied++;
          } catch (err) {
            errors.push(`Update ${table}/${item.id}: ${(err as Error).message}`);
          }
        }

        // Process deletes — soft-delete for regulatory compliance
        for (const id of tableChanges.deleted ?? []) {
          try {
            await this.applySoftDelete(tx, table, tenantId, id);
            applied++;
          } catch (err) {
            errors.push(`Delete ${table}/${id}: ${(err as Error).message}`);
          }
        }
      }

      // Audit the sync push inside the transaction
      await this.auditService.log({
        userId,
        userRole,
        tenantId,
        entityType: 'sync',
        entityId: tenantId,
        action: 'sync.push',
        metadata: { applied, conflicts, errorCount: errors.length },
      });
    });

    this.logger.log(
      `Sync push for tenant ${tenantId}: ${applied} applied, ${conflicts} conflicts, ${errors.length} errors`,
    );

    return { applied, conflicts, errors };
  }

  /**
   * Return reference/lookup data that changes infrequently.
   * Cached on the mobile client for offline use.
   */
  async getReferenceData(tenantId: string): Promise<ReferenceData> {
    const [strains, facilities, zones, exciseRates] = await Promise.all([
      // Strains are global (not tenant-scoped)
      this.prisma.strain.findMany({
        select: { id: true, name: true, type: true, thcRange: true, cbdRange: true },
      }),
      this.prisma.facility.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, facilityType: true, province: true },
      }),
      this.prisma.zone.findMany({
        where: { tenantId },
        select: { id: true, facilityId: true, name: true, capacity: true, currentCount: true },
      }),
      this.prisma.exciseRate.findMany({
        where: { isActive: true },
        select: { id: true, productCategory: true, ratePerUnit: true, unit: true },
      }),
    ]);

    return {
      cultivars: strains, // Spec uses "cultivars" — maps to strains
      zones,
      exciseRates,
      facilities,
      provinces: [
        'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
        'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
      ],
      facilityTypes: ['cultivation', 'processing', 'distribution', 'retail', 'research', 'hemp_industrial'],
      plantStates: ['seed', 'seedling', 'vegetative', 'flowering', 'harvested', 'destroyed', 'quarantined'],
      batchTypes: ['raw', 'processed', 'packaged', 'finished'],
      saleTypes: ['retail', 'wholesale', 'medical', 'export'],
      syncedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Private implementation details
  // =========================================================================

  private async pullTable(
    table: string,
    tenantId: string,
    since: Date,
  ): Promise<{ created: SyncRecord[]; updated: SyncRecord[]; deleted: string[] }> {
    switch (table) {
      case 'plants': {
        const all = await this.prisma.plant.findMany({
          where: { tenantId, updatedAt: { gt: since } },
          include: { strain: { select: { name: true } } },
        });
        const created = all
          .filter((p) => p.createdAt > since && p.updatedAt <= new Date(p.createdAt.getTime() + 1000))
          .map(this.serializePlant);
        const updated = all
          .filter((p) => !(p.createdAt > since && p.updatedAt <= new Date(p.createdAt.getTime() + 1000)))
          .map(this.serializePlant);
        const deleted = all.filter((p) => p.state === 'destroyed').map((p) => p.id);
        return { created, updated, deleted };
      }

      case 'batches': {
        const all = await this.prisma.batch.findMany({
          where: { tenantId, updatedAt: { gt: since } },
        });
        const created = all
          .filter((b) => b.createdAt > since && b.updatedAt <= new Date(b.createdAt.getTime() + 1000))
          .map(this.serializeRecord);
        const updated = all
          .filter((b) => !(b.createdAt > since && b.updatedAt <= new Date(b.createdAt.getTime() + 1000)))
          .map(this.serializeRecord);
        return { created, updated, deleted: [] };
      }

      case 'harvests': {
        const all = await this.prisma.harvest.findMany({
          where: { tenantId, updatedAt: { gt: since } },
        });
        const created = all
          .filter((h) => h.createdAt > since && h.updatedAt <= new Date(h.createdAt.getTime() + 1000))
          .map(this.serializeRecord);
        const updated = all
          .filter((h) => !(h.createdAt > since && h.updatedAt <= new Date(h.createdAt.getTime() + 1000)))
          .map(this.serializeRecord);
        return { created, updated, deleted: [] };
      }

      case 'inspections': {
        const all = await this.prisma.inspection.findMany({
          where: { tenantId, updatedAt: { gt: since } },
          include: { facility: { select: { name: true } } },
        });
        const created = all
          .filter((i) => i.createdAt > since && i.updatedAt <= new Date(i.createdAt.getTime() + 1000))
          .map(this.serializeRecord);
        const updated = all
          .filter((i) => !(i.createdAt > since && i.updatedAt <= new Date(i.createdAt.getTime() + 1000)))
          .map(this.serializeRecord);
        const deleted = all.filter((i) => i.status === 'cancelled').map((i) => i.id);
        return { created, updated, deleted };
      }

      case 'sales': {
        const all = await this.prisma.sale.findMany({
          where: { tenantId, updatedAt: { gt: since } },
        });
        const created = all
          .filter((s) => s.createdAt > since && s.updatedAt <= new Date(s.createdAt.getTime() + 1000))
          .map(this.serializeRecord);
        const updated = all
          .filter((s) => !(s.createdAt > since && s.updatedAt <= new Date(s.createdAt.getTime() + 1000)))
          .map(this.serializeRecord);
        return { created, updated, deleted: [] };
      }

      default:
        return { created: [], updated: [], deleted: [] };
    }
  }

  private async applyCreate(
    tx: TransactionClient,
    table: string,
    tenantId: string,
    id: string,
    record: Record<string, unknown>,
  ): Promise<void> {
    switch (table) {
      case 'plants':
        await tx.plant.create({
          data: {
            id,
            tenantId,
            trackingId: record.trackingId as string,
            strainId: record.strainId as string,
            facilityId: record.facilityId as string,
            zoneId: (record.zoneId as string) ?? null,
            state: (record.state as string) ?? 'vegetative',
            plantedDate: new Date(record.plantedDate as string),
            batchId: (record.batchId as string) ?? null,
          },
        });
        break;

      case 'batches':
        await tx.batch.create({
          data: {
            id,
            tenantId,
            facilityId: record.facilityId as string,
            strainId: record.strainId as string,
            batchNumber: record.batchNumber as string,
            batchType: (record.batchType as string) ?? 'raw',
            plantCount: (record.plantCount as number) ?? 0,
            createdDate: new Date((record.createdDate as string) ?? new Date()),
          },
        });
        break;

      case 'harvests':
        await tx.harvest.create({
          data: {
            id,
            tenantId,
            batchId: record.batchId as string,
            facilityId: record.facilityId as string,
            harvestDate: new Date(record.harvestDate as string),
            wetWeightGrams: record.wetWeightGrams as number,
            dryWeightGrams: (record.dryWeightGrams as number) ?? null,
            plantIds: (record.plantIds as string[]) ?? [],
            notes: (record.notes as string) ?? null,
          },
        });
        break;

      case 'inspections':
        // Inspections should be created via the regular API
        throw new BadRequestException(
          'Inspections cannot be created via sync. Use the inspections API.',
        );

      case 'sales':
        await tx.sale.create({
          data: {
            id,
            tenantId,
            batchId: record.batchId as string,
            facilityId: record.facilityId as string,
            saleNumber: record.saleNumber as string,
            quantityGrams: record.quantityGrams as number,
            priceZar: record.priceZar as number,
            saleDate: new Date(record.saleDate as string),
          },
        });
        break;

      default:
        throw new BadRequestException(`Unknown table: ${table}`);
    }
  }

  private async applyUpdate(
    tx: TransactionClient,
    table: string,
    tenantId: string,
    id: string,
    record: Record<string, unknown>,
    strategy: 'server_wins' | 'last_write_wins' | 'merge_fields' | 'reject_if_conflict',
    lastPulled: Date | null,
  ): Promise<'applied' | 'conflict'> {
    const existing = await this.getRecord(tx, table, id, tenantId);
    if (!existing) return 'applied'; // Record doesn't exist, skip

    const serverUpdatedAt = (existing as SyncEntity).updatedAt;
    const hasServerConflict = lastPulled ? serverUpdatedAt > lastPulled : false;

    if (!hasServerConflict) {
      // No conflict — apply client changes directly
      await this.updateRecord(tx, table, id, tenantId, record);
      return 'applied';
    }

    // CONFLICT — apply resolution strategy
    switch (strategy) {
      case 'server_wins':
        // Server wins: reject client changes
        this.logger.debug(`Conflict (server_wins): ${table}/${id} — server is newer`);
        return 'conflict';

      case 'last_write_wins':
        // Last write wins: apply client changes (client is "last")
        await this.updateRecord(tx, table, id, tenantId, record);
        return 'applied';

      case 'merge_fields':
        // Merge: client's non-null fields override, server's non-null preserved
        await this.mergeAndUpdate(tx, table, id, tenantId, record, existing);
        return 'applied';

      case 'reject_if_conflict':
        // Financial records: reject on any conflict
        this.logger.debug(`Conflict (reject_if_conflict): ${table}/${id} — rejected`);
        return 'conflict';

      default:
        return 'conflict';
    }
  }

  private async mergeAndUpdate(
    tx: TransactionClient,
    table: string,
    id: string,
    tenantId: string,
    clientRecord: Record<string, unknown>,
    _serverRecord: Record<string, unknown>,
  ): Promise<void> {
    // Strip WatermelonDB internal fields
    const { _status, _changed, _updatedAt, ...clientData } = clientRecord;
    const merged: Record<string, unknown> = {};

    // Client's non-null fields override server's
    for (const [key, value] of Object.entries(clientData)) {
      if (value !== null && value !== undefined) {
        merged[key] = value;
      }
    }

    await this.updateRecord(tx, table, id, tenantId, merged);
  }

  private async applySoftDelete(
    tx: TransactionClient,
    table: string,
    tenantId: string,
    id: string,
  ): Promise<void> {
    // For regulatory compliance, we don't hard-delete records.
    // Instead we mark them with a terminal state.
    switch (table) {
      case 'plants':
        await tx.plant.updateMany({
          where: { id, tenantId },
          data: { state: 'destroyed' },
        });
        break;
      case 'batches':
        // Batch model has no status field; log and skip soft-delete
        this.logger.warn(`Soft delete for batches not supported (no status field): ${id}`);
        break;
      case 'inspections':
        await tx.inspection.updateMany({
          where: { id, tenantId },
          data: { status: 'cancelled' },
        });
        break;
      default:
        this.logger.warn(`Soft delete not supported for table: ${table}`);
    }
  }

  private async getRecord(tx: TransactionClient, table: string, id: string, tenantId: string): Promise<Record<string, unknown> | null> {
    switch (table) {
      case 'plants':
        return tx.plant.findFirst({ where: { id, tenantId } }) as Promise<Record<string, unknown> | null>;
      case 'batches':
        return tx.batch.findFirst({ where: { id, tenantId } }) as Promise<Record<string, unknown> | null>;
      case 'harvests':
        return tx.harvest.findFirst({ where: { id, tenantId } }) as Promise<Record<string, unknown> | null>;
      case 'inspections':
        return tx.inspection.findFirst({ where: { id, tenantId } }) as Promise<Record<string, unknown> | null>;
      case 'sales':
        return tx.sale.findFirst({ where: { id, tenantId } }) as Promise<Record<string, unknown> | null>;
      default:
        return null;
    }
  }

  private async updateRecord(
    tx: TransactionClient,
    table: string,
    id: string,
    tenantId: string,
    record: Record<string, unknown>,
  ): Promise<void> {
    // Strip internal WatermelonDB fields
    const { _status, _changed, _updatedAt, ...data } = record;

    switch (table) {
      case 'plants': {
        const updateData: Record<string, unknown> = {};
        if (data.state) updateData.state = data.state;
        if (data.zoneId) updateData.zoneId = data.zoneId;
        if (data.batchId) updateData.batchId = data.batchId;
        await tx.plant.updateMany({ where: { id, tenantId }, data: updateData });
        break;
      }
      case 'batches': {
        const updateData: Record<string, unknown> = {};
        if (data.batchType) updateData.batchType = data.batchType;
        if (data.processedWeightGrams !== undefined) updateData.processedWeightGrams = data.processedWeightGrams;
        if (data.dryWeightGrams !== undefined) updateData.dryWeightGrams = data.dryWeightGrams;
        await tx.batch.updateMany({ where: { id, tenantId }, data: updateData });
        break;
      }
      case 'harvests': {
        const updateData: Record<string, unknown> = {};
        if (data.wetWeightGrams !== undefined) updateData.wetWeightGrams = data.wetWeightGrams;
        if (data.dryWeightGrams !== undefined) updateData.dryWeightGrams = data.dryWeightGrams;
        if (data.notes !== undefined) updateData.notes = data.notes;
        await tx.harvest.updateMany({ where: { id, tenantId }, data: updateData });
        break;
      }
      case 'inspections': {
        const updateData: Record<string, unknown> = {};
        if (data.checklist) updateData.checklist = data.checklist;
        if (data.findings) updateData.findings = data.findings;
        if (data.overallOutcome) updateData.overallOutcome = data.overallOutcome;
        if (data.status) updateData.status = data.status;
        if (data.photos) updateData.photos = data.photos;
        await tx.inspection.updateMany({ where: { id, tenantId }, data: updateData });
        break;
      }
      case 'sales': {
        const updateData: Record<string, unknown> = {};
        if (data.quantityGrams !== undefined) updateData.quantityGrams = data.quantityGrams;
        if (data.priceZar !== undefined) updateData.priceZar = data.priceZar;
        await tx.sale.updateMany({ where: { id, tenantId }, data: updateData });
        break;
      }
    }
  }

  private serializePlant(p: SyncEntity & { strain?: { name: string } }): SyncRecord {
    return {
      id: p.id,
      trackingId: p['trackingId'] as string,
      strainId: p['strainId'] as string,
      strainName: p.strain?.name,
      facilityId: p['facilityId'] as string,
      zoneId: p['zoneId'] as string | null,
      state: p['state'] as string,
      plantedDate: (p['plantedDate'] as Date | undefined)?.toISOString(),
      batchId: p['batchId'] as string | null,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
    };
  }

  private serializeRecord(r: Record<string, unknown>): SyncRecord {
    const record: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(r)) {
      if (value instanceof Date) {
        record[key] = value.toISOString();
      } else {
        record[key] = value;
      }
    }
    return record;
  }
}
