import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

/**
 * Section 6.2 — Transfer Manifest PDF Generator
 *
 * Generates a PDF manifest for a transfer, including sender/receiver
 * details, item list, vehicle/driver info, and a QR code placeholder.
 */
@Injectable()
export class TransferManifestGenerator {
  private readonly logger = new Logger(TransferManifestGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async generate(transferId: string): Promise<string> {
    const transfer = await this.prisma.transfer.findUniqueOrThrow({
      where: { id: transferId },
      include: {
        items: { include: { batch: true } },
      },
    });

    const [senderFacility, receiverFacility] = await Promise.all([
      this.prisma.facility.findUnique({
        where: { id: transfer.senderFacilityId },
        select: { name: true, address: true, province: true },
      }),
      this.prisma.facility.findUnique({
        where: { id: transfer.receiverFacilityId },
        select: { name: true, address: true, province: true },
      }),
    ]);

    const pdfBuffer = await this.renderPdf(
      transfer,
      senderFacility,
      receiverFacility,
    );

    const fileKey = `${transfer.tenantId}/transfers/${transfer.id}/manifest.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf', transfer.tenantId);

    this.logger.log(`Transfer manifest generated: ${fileKey}`);
    return fileKey;
  }

  private async renderPdf(
    transfer: {
      transferNumber: string;
      vehicleRegistration: string | null;
      driverName: string | null;
      driverIdNumber: string | null;
      createdAt: Date;
      items: Array<{
        batch: { batchNumber: string };
        quantityGrams: number;
      }>;
    },
    sender: { name: string; address: string; province: string } | null,
    receiver: { name: string; address: string; province: string } | null,
  ): Promise<Buffer> {
    // Dynamic import to avoid top-level ESM issues
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('NCTS Transfer Manifest', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Transfer Number: ${transfer.transferNumber}`);
      doc.text(`Date: ${transfer.createdAt.toISOString().split('T')[0]}`);
      doc.moveDown();

      // Sender
      doc.fontSize(14).text('Sender', { underline: true });
      doc.fontSize(10).text(`Facility: ${sender?.name || 'Unknown'}`);
      doc.text(`Address: ${sender?.address || 'N/A'}, ${sender?.province || ''}`);
      doc.moveDown();

      // Receiver
      doc.fontSize(14).text('Receiver', { underline: true });
      doc.fontSize(10).text(`Facility: ${receiver?.name || 'Unknown'}`);
      doc.text(`Address: ${receiver?.address || 'N/A'}, ${receiver?.province || ''}`);
      doc.moveDown();

      // Transport
      doc.fontSize(14).text('Transport Details', { underline: true });
      doc.fontSize(10).text(`Vehicle: ${transfer.vehicleRegistration || 'N/A'}`);
      doc.text(`Driver: ${transfer.driverName || 'N/A'}`);
      doc.text(`Driver ID: ${transfer.driverIdNumber || 'N/A'}`);
      doc.moveDown();

      // Items table
      doc.fontSize(14).text('Items', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(9);
      doc.text('Batch Number', 50, tableTop, { width: 200 });
      doc.text('Quantity (g)', 300, tableTop, { width: 100, align: 'right' });
      doc.moveTo(50, tableTop + 15).lineTo(450, tableTop + 15).stroke();

      let y = tableTop + 20;
      let totalGrams = 0;
      for (const item of transfer.items) {
        doc.text(item.batch.batchNumber, 50, y, { width: 200 });
        doc.text(item.quantityGrams.toFixed(2), 300, y, { width: 100, align: 'right' });
        totalGrams += item.quantityGrams;
        y += 15;
      }

      doc.moveTo(50, y).lineTo(450, y).stroke();
      y += 5;
      doc.fontSize(10).text('Total:', 50, y, { width: 200 });
      doc.text(`${totalGrams.toFixed(2)} g`, 300, y, { width: 100, align: 'right' });

      // Footer
      doc.moveDown(3);
      doc.fontSize(8)
        .text(
          'This document is an official transfer manifest issued under the National Cannabis Tracking System (NCTS). ' +
          'The information herein is subject to verification.',
          50,
          undefined,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
