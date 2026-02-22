import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt, hashForLookup } from '@ncts/crypto-lib';

/**
 * Section 9.3 — Encryption Key Manager
 *
 * Manages encryption/decryption of sensitive fields (MFA secrets, SA ID numbers)
 * using AES-256-GCM from @ncts/crypto-lib.
 *
 * Key source:
 * - Production: ENCRYPTION_KEY from environment (loaded from AWS KMS / secret store)
 * - Development: ENCRYPTION_KEY from .env file
 *
 * SA MISS (Minimum Information Security Standards) compliance:
 * data classified as CONFIDENTIAL must be encrypted at rest.
 */
@Injectable()
export class KeyManager {
  private readonly masterKey: string;
  private readonly lookupSalt: string;

  constructor(private readonly config: ConfigService) {
    this.masterKey = this.config.get<string>(
      'ENCRYPTION_KEY',
      'dev-only-encryption-key-32-chars!', // Default for dev only — MUST be overridden in prod
    );
    this.lookupSalt = this.config.get<string>(
      'HASH_SALT',
      'dev-only-hash-salt',
    );

    if (
      this.config.get('NODE_ENV') === 'production' &&
      this.masterKey === 'dev-only-encryption-key-32-chars!'
    ) {
      // RC-906: Fail hard in production — never allow dev fallback key
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY is not set in production! Refusing to start with dev fallback key.',
      );
    }

    if (
      this.config.get('NODE_ENV') === 'production' &&
      this.lookupSalt === 'dev-only-hash-salt'
    ) {
      throw new Error(
        'CRITICAL: HASH_SALT is not set in production! Refusing to start with dev fallback salt.',
      );
    }
  }

  /**
   * Encrypt a sensitive field before database storage.
   * Returns base64-encoded format: iv:ciphertext:authTag
   */
  encryptField(plaintext: string): string {
    return encrypt(plaintext, this.masterKey);
  }

  /**
   * Decrypt a sensitive field after database retrieval.
   */
  decryptField(ciphertext: string): string {
    return decrypt(ciphertext, this.masterKey);
  }

  /**
   * One-way hash for pseudonymization (e.g., SA ID numbers).
   * Uses SHA-256 with a salt. Suitable for lookup but NOT reversible.
   */
  pseudonymize(value: string): string {
    return hashForLookup(value, this.lookupSalt);
  }
}
