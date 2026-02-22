import { describe, it, expect } from 'vitest';
import { validateS3Key, sanitizeFilename } from '../validators/s3-key.validator';

describe('validateS3Key', () => {
  const tenantId = 'tenant-abc-123';

  it('accepts valid key with tenant prefix', () => {
    expect(() => validateS3Key(`${tenantId}/inspections/uuid/photo.jpg`, tenantId)).not.toThrow();
  });

  it('rejects path traversal (..)', () => {
    expect(() => validateS3Key(`${tenantId}/../etc/passwd`, tenantId)).toThrow();
  });

  it('rejects absolute path (leading /)', () => {
    expect(() => validateS3Key('/etc/passwd', tenantId)).toThrow();
  });

  it('rejects absolute path (drive letter)', () => {
    expect(() => validateS3Key('C:\\Windows\\system32', tenantId)).toThrow();
  });

  it('rejects null byte injection', () => {
    expect(() => validateS3Key(`${tenantId}/file.jpg\0.exe`, tenantId)).toThrow();
  });

  it('rejects key without tenant prefix', () => {
    expect(() => validateS3Key('other-tenant/file.jpg', tenantId)).toThrow();
  });

  it('rejects encoded traversal (..)', () => {
    // ..%2F still contains literal '..' so the validator correctly rejects it
    expect(() => validateS3Key(`${tenantId}/..%2F..%2Fetc/passwd`, tenantId)).toThrow();
    expect(() => validateS3Key(`${tenantId}/../file`, tenantId)).toThrow();
  });
});

describe('sanitizeFilename', () => {
  it('preserves normal filenames', () => {
    expect(sanitizeFilename('photo-001.jpg')).toBe('photo-001.jpg');
  });

  it('replaces unsafe characters with underscore', () => {
    const result = sanitizeFilename('file<name>.jpg');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('collapses consecutive dots', () => {
    const result = sanitizeFilename('file...name.jpg');
    expect(result).not.toContain('...');
  });

  it('truncates to 255 characters', () => {
    const longName = 'a'.repeat(300) + '.jpg';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
  });

  it('handles empty string', () => {
    const result = sanitizeFilename('');
    expect(typeof result).toBe('string');
  });
});
