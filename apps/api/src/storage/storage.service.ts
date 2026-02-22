import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { validateS3Key, sanitizeFilename } from '../common/validators/s3-key.validator';

/**
 * Section 6.1 — S3 Storage Service
 *
 * Provides presigned URL generation for client-side upload/download,
 * direct buffer upload for server-generated files (PDFs, CSVs),
 * and file deletion.
 *
 * Development: MinIO (S3-compatible, forcePathStyle required)
 * Production: AWS S3 (af-south-1)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get('AWS_REGION', 'af-south-1'),
      endpoint: this.config.get('S3_ENDPOINT') || undefined,
      forcePathStyle:
        this.config.get('S3_FORCE_PATH_STYLE', 'false') === 'true',
      credentials: {
        accessKeyId: this.config.get('AWS_ACCESS_KEY_ID', 'minioadmin'),
        secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
      },
    });
    this.bucket = this.config.get('S3_BUCKET', 'ncts-documents');
  }

  /**
   * Generate a presigned URL for client-side upload.
   * Files organized: {tenantId}/{entityType}/{entityId}/{timestamp}-{filename}
   */
  async getUploadUrl(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    filename: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; fileKey: string }> {
    const safeName = sanitizeFilename(params.filename);
    const fileKey = `${params.tenantId}/${params.entityType}/${params.entityId}/${Date.now()}-${safeName}`;

    // Section 9.1: Validate against path traversal
    validateS3Key(fileKey, params.tenantId);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: params.contentType,
      Metadata: {
        'tenant-id': params.tenantId,
        'entity-type': params.entityType,
        'entity-id': params.entityId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 min
    this.logger.debug(`Presigned upload URL generated: ${fileKey}`);
    return { uploadUrl, fileKey };
  }

  /**
   * Generate a presigned download URL (1-hour expiry).
   * RC-902: Validates file key against path traversal before generating URL.
   * tenantId is optional — when provided, enforces tenant prefix.
   */
  async getDownloadUrl(fileKey: string, tenantId?: string): Promise<string> {
    if (tenantId) {
      validateS3Key(fileKey, tenantId);
    } else {
      this.assertNoTraversal(fileKey);
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  /**
   * Upload a buffer directly (used for server-generated PDFs, CSVs, XML).
   * tenantId is optional — when provided, enforces tenant prefix.
   * System-level files (e.g. national reports) may omit tenantId.
   */
  async uploadBuffer(
    fileKey: string,
    buffer: Buffer,
    contentType: string,
    tenantId?: string,
  ): Promise<void> {
    if (tenantId) {
      validateS3Key(fileKey, tenantId);
    } else {
      this.assertNoTraversal(fileKey);
    }
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    this.logger.debug(`File uploaded: ${fileKey} (${buffer.length} bytes)`);
  }

  /**
   * Delete a file from S3.
   * RC-902: Validates file key against path traversal before deleting.
   */
  async deleteFile(fileKey: string, tenantId: string): Promise<void> {
    validateS3Key(fileKey, tenantId);
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }),
    );
    this.logger.debug(`File deleted: ${fileKey}`);
  }

  /**
   * Health check — verifies S3/MinIO bucket is reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Basic traversal check when tenantId is not available (system-level operations).
   * Rejects path traversal, absolute paths, and null bytes.
   */
  private assertNoTraversal(fileKey: string): void {
    if (fileKey.includes('..') || fileKey.startsWith('/') || /^[A-Za-z]:/.test(fileKey) || fileKey.includes('\0')) {
      throw new BadRequestException('Invalid file key: path traversal or invalid characters detected');
    }
  }
}
