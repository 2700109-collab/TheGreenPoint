/**
 * NCTS Crypto Library
 * Encryption utilities for sensitive data fields (POPIA compliance)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
// Tag length is 16 bytes (default for GCM)

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded string: iv:ciphertext:authTag
 */
export function encrypt(plaintext: string, key: string): string {
  const keyBuffer = createHash('sha256').update(key).digest();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 */
export function decrypt(encryptedString: string, key: string): string {
  const keyBuffer = createHash('sha256').update(key).digest();
  const [ivB64, ciphertextB64, tagB64] = encryptedString.split(':');

  if (!ivB64 || !ciphertextB64 || !tagB64) {
    throw new Error('Invalid encrypted string format');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash a value for lookup purposes (e.g., SA ID numbers).
 * Uses SHA-256 with a salt.
 */
export function hashForLookup(value: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}
