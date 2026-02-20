/**
 * NCTS QR Code Library
 * HMAC-signed verification URLs to prevent QR fabrication
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Generate an HMAC-signed verification URL for a tracking ID.
 *
 * Format: {baseUrl}/verify/{trackingId}?sig={hmac}
 */
export function generateVerificationUrl(
  trackingId: string,
  baseUrl: string,
  secret: string,
): string {
  const signature = createHmac('sha256', secret)
    .update(trackingId)
    .digest('hex')
    .slice(0, 16); // truncate to 16 chars for QR readability

  return `${baseUrl}/verify/${trackingId}?sig=${signature}`;
}

/**
 * Verify that a QR code URL signature is valid.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifySignature(
  trackingId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret)
    .update(trackingId)
    .digest('hex')
    .slice(0, 16);

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

/**
 * Generate the tracking ID for a plant.
 * Format: NCTS-ZA-{YEAR}-{6-digit sequential}
 */
export function generateTrackingId(year: number, sequence: number): string {
  return `NCTS-ZA-${year}-${String(sequence).padStart(6, '0')}`;
}
