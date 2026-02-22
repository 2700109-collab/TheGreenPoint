import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { StorageModule } from '../storage/storage.module';

/**
 * Section 7.6 — QR Code Generation Module
 *
 * Provides QR code SVG generation, Avery-label PDFs,
 * and bulk label generation for cannabis tracking.
 */
@Module({
  imports: [StorageModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
