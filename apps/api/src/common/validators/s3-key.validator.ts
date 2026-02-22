import { BadRequestException } from '@nestjs/common';

/**
 * Section 9.1 — S3 Path Traversal Prevention
 *
 * Validates that S3 keys:
 * 1. Don't contain path traversal sequences (../)
 * 2. Don't use absolute paths
 * 3. Are always prefixed with {tenantId}/
 *
 * Used in StorageService before any S3 operation.
 */

/**
 * Validate an S3 key against path traversal attacks.
 * Throws BadRequestException if the key is invalid.
 */
export function validateS3Key(fileKey: string, tenantId: string): void {
  // Reject path traversal sequences
  if (fileKey.includes('..')) {
    throw new BadRequestException(
      'Invalid file key: path traversal sequences (..) are not allowed',
    );
  }

  // Reject absolute paths
  if (fileKey.startsWith('/') || /^[A-Za-z]:/.test(fileKey)) {
    throw new BadRequestException(
      'Invalid file key: absolute paths are not allowed',
    );
  }

  // Reject null bytes (filesystem injection)
  if (fileKey.includes('\0')) {
    throw new BadRequestException(
      'Invalid file key: null bytes are not allowed',
    );
  }

  // Enforce tenant prefix
  if (!fileKey.startsWith(`${tenantId}/`)) {
    throw new BadRequestException(
      'Invalid file key: must be prefixed with tenant ID',
    );
  }
}

/**
 * Sanitize a filename by removing dangerous characters.
 * Preserves alphanumeric, dots, hyphens, and underscores.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars
    .replace(/\.{2,}/g, '.') // Collapse consecutive dots
    .substring(0, 255); // Limit length
}
