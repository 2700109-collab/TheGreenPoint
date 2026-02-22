import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ExportService } from './export.service';
import {
  TransferManifestGenerator,
  InspectionReportGenerator,
  LabCertificateGenerator,
  DestructionCertificateGenerator,
} from './generators';
import { StorageModule } from '../storage/storage.module';

/**
 * Section 6.2 / 6.3 — ReportsModule
 *
 * Provides PDF report generators, CSV/XML export service,
 * and regulatory return generation (DA 260, INCB Form C).
 */
@Module({
  imports: [StorageModule],
  controllers: [ReportsController],
  providers: [
    ExportService,
    TransferManifestGenerator,
    InspectionReportGenerator,
    LabCertificateGenerator,
    DestructionCertificateGenerator,
  ],
  exports: [
    ExportService,
    TransferManifestGenerator,
    InspectionReportGenerator,
    LabCertificateGenerator,
    DestructionCertificateGenerator,
  ],
})
export class ReportsModule {}
