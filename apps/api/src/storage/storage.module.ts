import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

/**
 * Section 6.1 — Storage Module
 *
 * Provides S3-based file storage with presigned URL generation.
 * Exports StorageService for use by report generators and other modules.
 */
@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
