import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

/**
 * Section 6.2 — Lab Certificate PDF Generator
 *
 * Generates a lab analysis certificate PDF with cannabinoid profile,
 * contaminant screening results, and lab accreditation details.
 */
@Injectable()
export class LabCertificateGenerator {
  private readonly logger = new Logger(LabCertificateGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async generate(labResultId: string): Promise<string> {
    const labResult = await this.prisma.labResult.findUniqueOrThrow({
      where: { id: labResultId },
      include: {
        batches: { select: { batchNumber: true, tenantId: true }, take: 1 },
      },
    });

    const pdfBuffer = await this.renderPdf(labResult);

    const tenantId = labResult.batches[0]?.tenantId ?? labResult.tenantId;
    const fileKey = `${tenantId}/lab-results/${labResult.id}/certificate.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf', tenantId);

    await this.prisma.labResult.update({
      where: { id: labResultId },
      data: { certificateUrl: fileKey },
    });

    this.logger.log(`Lab certificate generated: ${fileKey}`);
    return fileKey;
  }

  private async renderPdf(labResult: {
    id: string;
    labName: string;
    labAccreditationNumber: string | null;
    testDate: Date;
    status: string;
    thcPercent: number;
    cbdPercent: number;
    totalCannabinoidsPercent: number;
    moisturePercent: number | null;
    terpeneProfile: unknown;
    pesticidesPass: boolean;
    heavyMetalsPass: boolean;
    microbialsPass: boolean;
    mycotoxinsPass: boolean;
    batches: Array<{ batchNumber: string }>;
  }): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Laboratory Analysis Certificate', { align: 'center' });
      doc.moveDown();

      // Lab details
      doc.fontSize(14).text('Laboratory', { underline: true });
      doc.fontSize(10);
      doc.text(`Lab: ${labResult.labName}`);
      doc.text(`Accreditation: ${labResult.labAccreditationNumber || 'N/A'}`);
      doc.text(`Test Date: ${labResult.testDate.toISOString().split('T')[0]}`);
      doc.moveDown();

      // Sample info
      doc.fontSize(14).text('Sample Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Lab Result ID: ${labResult.id}`);
      const batchNumber = labResult.batches[0]?.batchNumber ?? 'N/A';
      doc.text(`Batch: ${batchNumber}`);
      doc.text(`Status: ${labResult.status}`);
      doc.moveDown();

      // Cannabinoid profile
      doc.fontSize(14).text('Cannabinoid Profile', { underline: true });
      doc.fontSize(10);
      doc.text(`THC: ${labResult.thcPercent != null ? `${labResult.thcPercent}%` : 'N/A'}`);
      doc.text(`CBD: ${labResult.cbdPercent != null ? `${labResult.cbdPercent}%` : 'N/A'}`);
      doc.text(
        `Total Cannabinoids: ${labResult.totalCannabinoidsPercent != null ? `${labResult.totalCannabinoidsPercent}%` : 'N/A'}`,
      );
      if (labResult.moisturePercent != null) {
        doc.text(`Moisture: ${labResult.moisturePercent}%`);
      }
      doc.moveDown();

      // Terpene profile
      const terpenes = labResult.terpeneProfile as Record<string, number> | null;
      if (terpenes && Object.keys(terpenes).length > 0) {
        doc.fontSize(14).text('Terpene Profile', { underline: true });
        doc.fontSize(10);
        for (const [name, value] of Object.entries(terpenes)) {
          doc.text(`  ${name}: ${value}%`);
        }
        doc.moveDown();
      }

      // Contaminant screening
      doc.fontSize(14).text('Contaminant Screening', { underline: true });
      doc.fontSize(10);

      const screenings: Array<{ label: string; value: boolean }> = [
        { label: 'Pesticides', value: labResult.pesticidesPass },
        { label: 'Heavy Metals', value: labResult.heavyMetalsPass },
        { label: 'Microbials', value: labResult.microbialsPass },
        { label: 'Mycotoxins', value: labResult.mycotoxinsPass },
      ];

      for (const s of screenings) {
        const status = s.value ? 'PASS' : 'FAIL';
        doc.text(`  ${s.label}: ${status}`);
      }
      doc.moveDown();

      // Overall status
      doc.fontSize(14).text('Overall Status', { underline: true });
      const allPass = labResult.pesticidesPass && labResult.heavyMetalsPass &&
        labResult.microbialsPass && labResult.mycotoxinsPass;
      doc.fontSize(12).text(allPass ? 'PASS' : 'FAIL', { align: 'center' });
      doc.moveDown(2);

      // Footer
      doc.fontSize(8)
        .text(
          'This certificate has been generated from data recorded in the National Cannabis Tracking System (NCTS). ' +
          'Original laboratory documentation should be retained for regulatory compliance.',
          50,
          undefined,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
