import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

/**
 * Section 6.2 — Inspection Report PDF Generator
 *
 * Generates an official inspection report PDF containing the checklist,
 * findings, outcome, and any remediation actions required.
 */
@Injectable()
export class InspectionReportGenerator {
  private readonly logger = new Logger(InspectionReportGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async generate(inspectionId: string): Promise<string> {
    const inspection = await this.prisma.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      include: {
        facility: { select: { name: true, address: true, province: true, municipalLicenseNumber: true } },
      },
    });

    const pdfBuffer = await this.renderPdf(
      inspection as Parameters<typeof this.renderPdf>[0],
    );

    const fileKey = `${inspection.tenantId}/inspections/${inspection.id}/report.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf', inspection.tenantId);

    await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: { reportUrl: fileKey },
    });

    this.logger.log(`Inspection report generated: ${fileKey}`);
    return fileKey;
  }

  private async renderPdf(inspection: {
    type: string;
    priority: string;
    status: string;
    inspectorId: string;
    scheduledDate: Date;
    completedDate: Date | null;
    checklist: unknown;
    findings: string | null;
    overallOutcome: string | null;
    remediationRequired: boolean;
    remediationDeadline: Date | null;
    additionalInspectors: string[];
    facility: { name: string; address: string; province: string; municipalLicenseNumber: string | null };
  }): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('NCTS Inspection Report', { align: 'center' });
      doc.moveDown();

      // Facility info
      doc.fontSize(14).text('Facility Details', { underline: true });
      doc.fontSize(10);
      doc.text(`Facility: ${inspection.facility?.name || 'Unknown'}`);
      doc.text(`Address: ${inspection.facility?.address || 'N/A'}, ${inspection.facility?.province || ''}`);
      doc.text(`License: ${inspection.facility?.municipalLicenseNumber || 'N/A'}`);
      doc.moveDown();

      // Inspection meta
      doc.fontSize(14).text('Inspection Details', { underline: true });
      doc.fontSize(10);
      doc.text(`Type: ${inspection.type}`);
      doc.text(`Priority: ${inspection.priority}`);
      doc.text(`Status: ${inspection.status}`);
      doc.text(`Scheduled: ${inspection.scheduledDate.toISOString().split('T')[0]}`);
      doc.text(`Completed: ${inspection.completedDate?.toISOString().split('T')[0] || 'Pending'}`);
      doc.text(`Inspector: ${inspection.inspectorId}`);
      if (inspection.additionalInspectors.length > 0) {
        doc.text(`Additional Inspectors: ${inspection.additionalInspectors.join(', ')}`);
      }
      doc.moveDown();

      // Checklist
      doc.fontSize(14).text('Inspection Checklist', { underline: true });
      doc.fontSize(10);
      const checklist = inspection.checklist as
        | Array<{ item: string; passed: boolean; notes?: string }>
        | null;
      if (Array.isArray(checklist)) {
        for (const entry of checklist) {
          const status = entry.passed ? '✓' : '✗';
          doc.text(`  ${status}  ${entry.item}`);
          if (entry.notes) {
            doc.text(`      Notes: ${entry.notes}`, { indent: 20 });
          }
        }
      } else {
        doc.text('No checklist data available.');
      }
      doc.moveDown();

      // Outcome & findings
      doc.fontSize(14).text('Outcome', { underline: true });
      doc.fontSize(10);
      doc.text(`Overall Outcome: ${inspection.overallOutcome || 'Pending'}`);
      doc.moveDown(0.5);

      if (inspection.findings) {
        doc.fontSize(14).text('Findings', { underline: true });
        doc.fontSize(10).text(inspection.findings);
        doc.moveDown();
      }

      // Remediation
      if (inspection.remediationRequired) {
        doc.fontSize(14).text('Remediation Required', { underline: true });
        doc.fontSize(10);
        doc.text('Remediation actions must be taken.');
        if (inspection.remediationDeadline) {
          doc.text(`Deadline: ${inspection.remediationDeadline.toISOString().split('T')[0]}`);
        }
        doc.moveDown();
      }

      // Footer
      doc.fontSize(8)
        .text(
          'This report is generated by the National Cannabis Tracking System (NCTS). ' +
          'It constitutes an official record of the inspection conducted.',
          50,
          undefined,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
