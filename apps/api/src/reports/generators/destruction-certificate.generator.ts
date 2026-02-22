import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

/**
 * Section 6.2 — Destruction Certificate PDF Generator
 *
 * Generates an official destruction certificate with witness details,
 * destruction method, quantities, and entity information.
 */
@Injectable()
export class DestructionCertificateGenerator {
  private readonly logger = new Logger(DestructionCertificateGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async generate(destructionEventId: string): Promise<string> {
    const event = await this.prisma.destructionEvent.findUniqueOrThrow({
      where: { id: destructionEventId },
    });

    const pdfBuffer = await this.renderPdf(event);

    const fileKey = `${event.tenantId}/destructions/${event.id}/certificate.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf', event.tenantId);

    this.logger.log(`Destruction certificate generated: ${fileKey}`);
    return fileKey;
  }

  private async renderPdf(event: {
    id: string;
    entityType: string;
    entityIds: string[];
    quantityKg: number;
    destructionMethod: string;
    destructionDate: Date;
    reason: string;
    witnessNames: string[];
    witnessOrganizations: string[];
    witnessSignatures: string[];
    regulatoryNotified: boolean;
    createdAt: Date;
  }): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('NCTS Destruction Certificate', { align: 'center' });
      doc.moveDown();

      // Certificate number
      doc.fontSize(12).text(`Reference: ${event.id}`);
      doc.text(`Date of Destruction: ${event.destructionDate.toISOString().split('T')[0]}`);
      doc.text(`Date Issued: ${event.createdAt.toISOString().split('T')[0]}`);
      doc.moveDown();

      // Entity details
      doc.fontSize(14).text('Destroyed Material', { underline: true });
      doc.fontSize(10);
      doc.text(`Entity Type: ${event.entityType}`);
      doc.text(`Number of Entities: ${event.entityIds.length}`);
      doc.text(`Quantity: ${event.quantityKg} kg`);
      doc.text(`Destruction Method: ${event.destructionMethod}`);
      doc.text(`Reason: ${event.reason}`);
      doc.moveDown();

      // Entity IDs
      if (event.entityIds.length > 0) {
        doc.fontSize(14).text('Entity Identifiers', { underline: true });
        doc.fontSize(9);
        for (const entityId of event.entityIds) {
          doc.text(`  • ${entityId}`);
        }
        doc.moveDown();
      }

      // Witnesses
      doc.fontSize(14).text('Witnesses', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(9);
      doc.text('Name', 50, tableTop, { width: 180 });
      doc.text('Organization', 240, tableTop, { width: 180 });
      doc.text('Signature', 430, tableTop, { width: 80 });
      doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).stroke();

      let y = tableTop + 20;
      for (let i = 0; i < event.witnessNames.length; i++) {
        doc.text(event.witnessNames[i] || '', 50, y, { width: 180 });
        doc.text(event.witnessOrganizations[i] || '', 240, y, { width: 180 });
        doc.text(event.witnessSignatures[i] ? 'On file' : 'N/A', 430, y, { width: 80 });
        y += 15;
      }
      doc.moveDown(2);

      // Regulatory status
      doc.fontSize(10).text(
        `Regulatory Authority Notified: ${event.regulatoryNotified ? 'Yes' : 'No'}`,
      );
      doc.moveDown(2);

      // Footer
      doc.fontSize(8)
        .text(
          'This certificate is an official record of cannabis destruction issued under the National Cannabis Tracking System (NCTS). ' +
          'All parties named above attest to the destruction described herein.',
          50,
          undefined,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
