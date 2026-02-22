import { describe, it, expect } from 'vitest';
import { computeEventHash, verifyChain, GENESIS_HASH } from '../src/hash-chain';
import type { AuditEventInput } from '../src/hash-chain';

const makeEvent = (overrides: Partial<AuditEventInput> = {}): AuditEventInput => ({
  id: 'evt-001',
  entityType: 'plant',
  entityId: 'plant-001',
  action: 'created',
  actorId: 'user-001',
  payload: { strainId: 'strain-001' },
  previousHash: GENESIS_HASH,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

// ── computeEventHash ─────────────────────────────────────────
describe('computeEventHash', () => {
  it('produces a 64-char hex string (SHA-256)', () => {
    const hash = computeEventHash(makeEvent());
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic (same input → same hash)', () => {
    const event = makeEvent();
    expect(computeEventHash(event)).toBe(computeEventHash(event));
  });

  it('changes when any field changes', () => {
    const base = makeEvent();
    const baseHash = computeEventHash(base);

    // Change each field and verify hash differs
    expect(computeEventHash(makeEvent({ id: 'evt-002' }))).not.toBe(baseHash);
    expect(computeEventHash(makeEvent({ entityType: 'batch' }))).not.toBe(baseHash);
    expect(computeEventHash(makeEvent({ entityId: 'plant-999' }))).not.toBe(baseHash);
    expect(computeEventHash(makeEvent({ action: 'updated' }))).not.toBe(baseHash);
    expect(computeEventHash(makeEvent({ actorId: 'user-002' }))).not.toBe(baseHash);
    expect(computeEventHash(makeEvent({ payload: { extra: true } }))).not.toBe(baseHash);
    expect(computeEventHash(makeEvent({ previousHash: 'different' }))).not.toBe(baseHash);
    expect(computeEventHash(makeEvent({ createdAt: '2025-12-31T23:59:59Z' }))).not.toBe(baseHash);
  });
});

// ── verifyChain ──────────────────────────────────────────────
describe('verifyChain', () => {
  it('returns valid for empty chain', () => {
    const result = verifyChain([]);
    expect(result.valid).toBe(true);
    expect(result.checkedCount).toBe(0);
  });

  it('returns valid for single correct event', () => {
    const event = makeEvent();
    const hash = computeEventHash(event);
    const result = verifyChain([{ ...event, eventHash: hash }]);
    expect(result.valid).toBe(true);
    expect(result.checkedCount).toBe(1);
  });

  it('returns valid for multi-event chain', () => {
    const evt1 = makeEvent({ id: 'evt-001' });
    const hash1 = computeEventHash(evt1);

    const evt2 = makeEvent({ id: 'evt-002', previousHash: hash1 });
    const hash2 = computeEventHash(evt2);

    const evt3 = makeEvent({ id: 'evt-003', previousHash: hash2 });
    const hash3 = computeEventHash(evt3);

    const result = verifyChain([
      { ...evt1, eventHash: hash1 },
      { ...evt2, eventHash: hash2 },
      { ...evt3, eventHash: hash3 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.checkedCount).toBe(3);
  });

  it('detects tampered event hash', () => {
    const event = makeEvent();
    const result = verifyChain([{ ...event, eventHash: 'tampered_hash' }]);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it('detects broken chain link (wrong previousHash)', () => {
    const evt1 = makeEvent({ id: 'evt-001' });
    const hash1 = computeEventHash(evt1);

    const evt2 = makeEvent({ id: 'evt-002', previousHash: 'WRONG_HASH' });
    const hash2 = computeEventHash(evt2);

    const result = verifyChain([
      { ...evt1, eventHash: hash1 },
      { ...evt2, eventHash: hash2 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
  });

  it('returns expected and actual hashes on failure', () => {
    const event = makeEvent();
    const result = verifyChain([{ ...event, eventHash: 'bad' }]);
    expect(result.expectedHash).toBeDefined();
    expect(result.actualHash).toBe('bad');
  });
});

// ── GENESIS_HASH ─────────────────────────────────────────────
describe('GENESIS_HASH', () => {
  it('is a string starting with NCTS-GENESIS', () => {
    expect(GENESIS_HASH).toMatch(/^NCTS-GENESIS-/);
  });
});
