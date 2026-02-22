import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, hashForLookup } from './index';

const TEST_KEY = 'test-encryption-key-for-unit-tests';

// ── encrypt + decrypt round-trip ─────────────────────────────
describe('encrypt / decrypt', () => {
  it('round-trips plaintext correctly', () => {
    const plaintext = 'Sensitive PII data: 8501015009088';
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'Same input';
    const a = encrypt(plaintext, TEST_KEY);
    const b = encrypt(plaintext, TEST_KEY);
    expect(a).not.toBe(b);
  });

  it('output format is iv:ciphertext:authTag (3 base64 parts)', () => {
    const encrypted = encrypt('test', TEST_KEY);
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
  });

  it('fails to decrypt with wrong key', () => {
    const encrypted = encrypt('secret', TEST_KEY);
    expect(() => decrypt(encrypted, 'wrong-key')).toThrow();
  });

  it('fails on tampered ciphertext', () => {
    const encrypted = encrypt('secret', TEST_KEY);
    const parts = encrypted.split(':');
    parts[1] = 'AAAA' + parts[1]!.slice(4); // tamper with ciphertext
    expect(() => decrypt(parts.join(':'), TEST_KEY)).toThrow();
  });

  it('fails on invalid format (missing parts)', () => {
    expect(() => decrypt('onlyone', TEST_KEY)).toThrow();
  });

  it('handles empty string (encrypt produces valid format)', () => {
    const encrypted = encrypt('', TEST_KEY);
    // Empty plaintext still produces iv:ciphertext:authTag
    // but ciphertext may be empty string which fails split check
    // This documents the behavior — empty plaintext is not supported
    expect(encrypted).toBeDefined();
    expect(encrypted.split(':')).toHaveLength(3);
  });

  it('handles unicode', () => {
    const unicode = '药用大麻跟踪系统 🌿';
    const encrypted = encrypt(unicode, TEST_KEY);
    expect(decrypt(encrypted, TEST_KEY)).toBe(unicode);
  });
});

// ── hashForLookup ────────────────────────────────────────────
describe('hashForLookup', () => {
  it('produces a 64-char hex SHA-256', () => {
    const hash = hashForLookup('8501015009088', 'salt');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const a = hashForLookup('value', 'salt');
    const b = hashForLookup('value', 'salt');
    expect(a).toBe(b);
  });

  it('differs with different salts', () => {
    const a = hashForLookup('value', 'salt-a');
    const b = hashForLookup('value', 'salt-b');
    expect(a).not.toBe(b);
  });

  it('differs with different values', () => {
    const a = hashForLookup('value-a', 'salt');
    const b = hashForLookup('value-b', 'salt');
    expect(a).not.toBe(b);
  });
});
