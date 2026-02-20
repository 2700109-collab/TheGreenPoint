import { createHash } from 'crypto';

/** Known constant used as previous_hash for the genesis (first) audit event */
export const GENESIS_HASH =
  'NCTS-GENESIS-0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditEventInput {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  payload: Record<string, unknown>;
  previousHash: string;
  createdAt: string;
}

/**
 * Compute the SHA-256 hash for an audit event.
 *
 * hash = SHA-256(id || entityType || entityId || action || actorId || JSON(payload) || previousHash || createdAt)
 */
export function computeEventHash(event: AuditEventInput): string {
  const data = [
    event.id,
    event.entityType,
    event.entityId,
    event.action,
    event.actorId,
    JSON.stringify(event.payload),
    event.previousHash,
    event.createdAt,
  ].join('|');

  return createHash('sha256').update(data).digest('hex');
}

export interface ChainVerificationResult {
  valid: boolean;
  checkedCount: number;
  brokenAt?: number; // index of first broken link
  expectedHash?: string;
  actualHash?: string;
}

/**
 * Verify the integrity of a chain of audit events.
 * Events must be ordered by sequence_number ASC.
 * Returns whether the chain is intact and where it breaks (if at all).
 */
export function verifyChain(events: (AuditEventInput & { eventHash: string })[]): ChainVerificationResult {
  if (events.length === 0) {
    return { valid: true, checkedCount: 0 };
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!;
    const expectedHash = computeEventHash(event);

    if (expectedHash !== event.eventHash) {
      return {
        valid: false,
        checkedCount: i + 1,
        brokenAt: i,
        expectedHash,
        actualHash: event.eventHash,
      };
    }

    // Verify chain linkage (previous hash)
    if (i > 0) {
      const prevEvent = events[i - 1]!;
      if (event.previousHash !== prevEvent.eventHash) {
        return {
          valid: false,
          checkedCount: i + 1,
          brokenAt: i,
          expectedHash: prevEvent.eventHash,
          actualHash: event.previousHash,
        };
      }
    }
  }

  return { valid: true, checkedCount: events.length };
}
