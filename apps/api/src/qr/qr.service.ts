import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { generateVerificationUrl } from '@ncts/qr-lib';
import * as QRCode from 'qrcode';

/**
 * Section 7.6 — QR Code Generation Service
 *
 * Generates QR codes for cannabis tracking:
 *   - Single batch QR as SVG
 *   - Avery-label PDF with QR + metadata
 *   - Bulk label PDF for multiple plants/batches
 *
 * Uses @ncts/qr-lib for HMAC-signed verification URLs
 * and the `qrcode` npm package for SVG rendering.
 */
@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private readonly verifyBaseUrl: string;
  private readonly hmacSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {
    this.verifyBaseUrl = this.config.get(
      'VERIFY_APP_URL',
      'https://verify.greenpoint.co.za',
    );
    this.hmacSecret = this.config.get('QR_HMAC_SECRET', 'dev-secret');

    if (
      this.config.get('NODE_ENV') === 'production' &&
      this.hmacSecret === 'dev-secret'
    ) {
      throw new Error(
        'CRITICAL: QR_HMAC_SECRET is not set in production! Refusing to start with dev fallback secret.',
      );
    }
  }

  /**
   * Generate a QR code SVG for a batch.
   * The QR encodes the HMAC-signed verification URL.
   * Uses the first plant's trackingId or falls back to the batchNumber.
   */
  async generateBatchQrSvg(batchId: string, size: number = 256): Promise<string> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        plants: { select: { trackingId: true }, take: 1 },
      },
    });
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const trackingId =
      batch.plants[0]?.trackingId ?? `BATCH-${batch.batchNumber}`;
    const verifyUrl = generateVerificationUrl(
      trackingId,
      this.verifyBaseUrl,
      this.hmacSecret,
    );

    const svg = await QRCode.toString(verifyUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: size,
    });

    return svg;
  }

  /**
   * Generate a single Avery-format label PDF with QR code and metadata.
   * Returns the S3 file key of the uploaded PDF.
   */
  async generateAveryLabel(batchId: string): Promise<string> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        strain: { select: { name: true, type: true } },
        facility: { select: { name: true, tenantId: true } },
        labResult: { select: { status: true, thcPercent: true, cbdPercent: true } },
        plants: { select: { trackingId: true }, take: 1 },
      },
    });
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const trackingId =
      batch.plants[0]?.trackingId ?? `BATCH-${batch.batchNumber}`;
    const verifyUrl = generateVerificationUrl(
      trackingId,
      this.verifyBaseUrl,
      this.hmacSecret,
    );

    const qrPng = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 150,
    });

    const pdfBuffer = await this.renderLabelPdf([
      {
        trackingId,
        batchNumber: batch.batchNumber,
        strainName: batch.strain?.name ?? 'Unknown',
        strainType: batch.strain?.type ?? 'Unknown',
        facilityName: batch.facility.name,
        thcPercent: batch.labResult?.thcPercent ?? null,
        cbdPercent: batch.labResult?.cbdPercent ?? null,
        qrPng,
      },
    ]);

    const fileKey = `${batch.facility.tenantId}/qr-labels/${batch.batchNumber}-label.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf', batch.facility.tenantId);

    this.logger.log(`Avery label generated for batch ${batch.batchNumber}: ${fileKey}`);
    return fileKey;
  }

  /**
   * Generate a bulk label PDF for multiple batches.
   * Returns the S3 file key of the uploaded PDF.
   */
  async generateBulkLabels(
    batchIds: string[],
    tenantId: string,
  ): Promise<string> {
    if (batchIds.length === 0) {
      throw new BadRequestException('At least one batch ID is required');
    }
    if (batchIds.length > 100) {
      throw new BadRequestException('Maximum 100 batches per bulk label request');
    }

    const batches = await this.prisma.batch.findMany({
      where: { id: { in: batchIds }, tenantId },
      include: {
        strain: { select: { name: true, type: true } },
        facility: { select: { name: true } },
        labResult: { select: { status: true, thcPercent: true, cbdPercent: true } },
        plants: { select: { trackingId: true }, take: 1 },
      },
    });

    if (batches.length === 0) {
      throw new NotFoundException('No batches found for the given IDs');
    }

    const labels: LabelData[] = [];
    for (const batch of batches) {
      const trackingId =
        batch.plants[0]?.trackingId ?? `BATCH-${batch.batchNumber}`;
      const verifyUrl = generateVerificationUrl(
        trackingId,
        this.verifyBaseUrl,
        this.hmacSecret,
      );

      const qrPng = await QRCode.toBuffer(verifyUrl, {
        type: 'png',
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 150,
      });

      labels.push({
        trackingId,
        batchNumber: batch.batchNumber,
        strainName: batch.strain?.name ?? 'Unknown',
        strainType: batch.strain?.type ?? 'Unknown',
        facilityName: batch.facility.name,
        thcPercent: batch.labResult?.thcPercent ?? null,
        cbdPercent: batch.labResult?.cbdPercent ?? null,
        qrPng,
      });
    }

    const pdfBuffer = await this.renderLabelPdf(labels);

    const fileKey = `${tenantId}/qr-labels/bulk-${Date.now()}.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf', tenantId);

    this.logger.log(
      `Bulk labels generated: ${labels.length} labels → ${fileKey}`,
    );
    return fileKey;
  }

  /**
   * Render an Avery-format label PDF.
   * Layout: 2 columns × N rows, each cell ~2.6" × 1" (Avery 5160 compatible).
   */
  private async renderLabelPdf(labels: LabelData[]): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 36, left: 18, right: 18 },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const colWidth = 288; // ~4 inches
      const rowHeight = 72; // ~1 inch
      const cols = 2;
      const maxRowsPerPage = 10;
      const qrSize = 58;
      const textX = 70;

      let labelIndex = 0;
      for (const label of labels) {
        const onPageIndex = labelIndex % (cols * maxRowsPerPage);
        const col = onPageIndex % cols;
        const row = Math.floor(onPageIndex / cols);

        if (labelIndex > 0 && onPageIndex === 0) {
          doc.addPage();
        }

        const x = 18 + col * colWidth;
        const y = 36 + row * rowHeight;

        // QR code image
        try {
          doc.image(label.qrPng, x + 2, y + 4, { width: qrSize, height: qrSize });
        } catch {
          doc.rect(x + 2, y + 4, qrSize, qrSize).stroke();
        }

        // Text labels
        doc
          .fontSize(7)
          .font('Helvetica-Bold')
          .text(label.trackingId, x + textX, y + 4, { width: colWidth - textX - 10 });

        doc
          .fontSize(6)
          .font('Helvetica')
          .text(`Batch: ${label.batchNumber}`, x + textX, y + 16, {
            width: colWidth - textX - 10,
          })
          .text(`${label.strainName} (${label.strainType})`, x + textX, y + 26, {
            width: colWidth - textX - 10,
          })
          .text(`Facility: ${label.facilityName}`, x + textX, y + 36, {
            width: colWidth - textX - 10,
          });

        if (label.thcPercent !== null || label.cbdPercent !== null) {
          const thc = label.thcPercent != null ? `THC: ${label.thcPercent}%` : '';
          const cbd = label.cbdPercent != null ? `CBD: ${label.cbdPercent}%` : '';
          doc.text(
            [thc, cbd].filter(Boolean).join('  '),
            x + textX,
            y + 46,
            { width: colWidth - textX - 10 },
          );
        }

        // Border
        doc.rect(x, y, colWidth - 4, rowHeight - 4).stroke('#cccccc');

        labelIndex++;
      }

      doc.end();
    });
  }
}

interface LabelData {
  trackingId: string;
  batchNumber: string;
  strainName: string;
  strainType: string;
  facilityName: string;
  thcPercent: number | null;
  cbdPercent: number | null;
  qrPng: Buffer;
}
