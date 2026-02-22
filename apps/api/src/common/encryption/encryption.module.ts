import { Global, Module } from '@nestjs/common';
import { KeyManager } from './key-manager';

/**
 * Section 9.3 — Encryption Module
 *
 * Global module providing KeyManager for field-level encryption
 * of sensitive data (MFA secrets, SA ID numbers, patient pseudonymization).
 */
@Global()
@Module({
  providers: [KeyManager],
  exports: [KeyManager],
})
export class EncryptionModule {}
