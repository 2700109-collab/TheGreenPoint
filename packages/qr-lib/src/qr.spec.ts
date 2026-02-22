import { describe, it, expect } from 'vitest';
import { generateVerificationUrl, verifySignature, generateTrackingId } from './index';

const SECRET = 'test-hmac-secret-for-unit-tests';
const BASE_URL = 'https://verify.ncts.gov.za';

// ── generateVerificationUrl ──────────────────────────────────
describe('generateVerificationUrl', () => {
  it('generates URL with correct format', () => {
    const url = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, SECRET);
    expect(url).toMatch(/^https:\/\/verify\.ncts\.gov\.za\/verify\/NCTS-ZA-2025-000001\?sig=[0-9a-f]{16}$/);
  });

  it('is deterministic', () => {
    const a = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, SECRET);
    const b = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, SECRET);
    expect(a).toBe(b);
  });

  it('produces different signatures for different tracking IDs', () => {
    const a = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, SECRET);
    const b = generateVerificationUrl('NCTS-ZA-2025-000002', BASE_URL, SECRET);
    expect(a).not.toBe(b);
  });

  it('produces different signatures with different secrets', () => {
    const a = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, 'secret-a');
    const b = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, 'secret-b');
    expect(a).not.toBe(b);
  });
});

// ── verifySignature ──────────────────────────────────────────
describe('verifySignature', () => {
  it('returns true for valid signature', () => {
    const url = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, SECRET);
    const sig = new URL(url).searchParams.get('sig')!;
    expect(verifySignature('NCTS-ZA-2025-000001', sig, SECRET)).toBe(true);
  });

  it('returns false for wrong signature', () => {
    expect(verifySignature('NCTS-ZA-2025-000001', 'aaaa1111bbbb2222', SECRET)).toBe(false);
  });

  it('returns false for wrong tracking ID', () => {
    const url = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, SECRET);
    const sig = new URL(url).searchParams.get('sig')!;
    expect(verifySignature('NCTS-ZA-2025-WRONG', sig, SECRET)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const url = generateVerificationUrl('NCTS-ZA-2025-000001', BASE_URL, SECRET);
    const sig = new URL(url).searchParams.get('sig')!;
    expect(verifySignature('NCTS-ZA-2025-000001', sig, 'wrong-secret')).toBe(false);
  });

  it('returns false for mismatched length signature', () => {
    expect(verifySignature('NCTS-ZA-2025-000001', 'short', SECRET)).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifySignature('NCTS-ZA-2025-000001', '', SECRET)).toBe(false);
  });
});

// ── generateTrackingId ───────────────────────────────────────
describe('generateTrackingId', () => {
  it('formats correctly: NCTS-ZA-{YEAR}-{6 digits}', () => {
    expect(generateTrackingId(2025, 1)).toBe('NCTS-ZA-2025-000001');
  });

  it('pads sequence to 6 digits', () => {
    expect(generateTrackingId(2025, 42)).toBe('NCTS-ZA-2025-000042');
    expect(generateTrackingId(2025, 123456)).toBe('NCTS-ZA-2025-123456');
  });

  it('handles large sequence numbers', () => {
    expect(generateTrackingId(2025, 999999)).toBe('NCTS-ZA-2025-999999');
  });

  it('includes correct year', () => {
    expect(generateTrackingId(2030, 1)).toContain('2030');
  });
});
