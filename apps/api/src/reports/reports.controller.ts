import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { ExportService } from './export.service';
import { StorageService } from '../storage/storage.service';
import {
  TransferManifestGenerator,
  InspectionReportGenerator,
  LabCertificateGenerator,
  DestructionCertificateGenerator,
} from './generators';
import {
  CsvExportDto,
  Da260ParamDto,
  Da260BodyDto,
  IncbFormCParamDto,
  DownloadParamDto,
  GenerateReportDto,
  ReportHistoryQueryDto,
} from './dto';

/**
 * Section 6.2 / 6.3 — Reports & Export Controller
 *
 * Endpoints for PDF report generation, CSV/XML exports, and
 * regulatory returns (DA 260, INCB Form C).
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly exportService: ExportService,
    private readonly storageService: StorageService,
    private readonly transferManifest: TransferManifestGenerator,
    private readonly inspectionReport: InspectionReportGenerator,
    private readonly labCertificate: LabCertificateGenerator,
    private readonly destructionCertificate: DestructionCertificateGenerator,
  ) {}

  /* ------------------------------------------------------------------
   * POST /reports/generate  — Generate a PDF report
   * ------------------------------------------------------------------ */

  @Post('generate')
  @Roles('operator_admin', 'regulator', 'inspector', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a PDF report (manifest, inspection, lab, destruction)' })
  @ApiResponse({ status: 201, description: 'Report generated successfully, returns file key' })
  @ApiResponse({ status: 400, description: 'Invalid report type or entity ID' })
  @ApiResponse({ status: 404, description: 'Source entity not found' })
  async generateReport(@Body() dto: GenerateReportDto): Promise<{ fileKey: string }> {
    let fileKey: string;

    switch (dto.reportType) {
      case 'transfer_manifest':
        fileKey = await this.transferManifest.generate(dto.entityId);
        break;
      case 'inspection_report':
        fileKey = await this.inspectionReport.generate(dto.entityId);
        break;
      case 'lab_certificate':
        fileKey = await this.labCertificate.generate(dto.entityId);
        break;
      case 'destruction_certificate':
        fileKey = await this.destructionCertificate.generate(dto.entityId);
        break;
      default:
        throw new BadRequestException(`Unknown report type: ${dto.reportType}`);
    }

    return { fileKey };
  }

  /* ------------------------------------------------------------------
   * POST /reports/export  — Generic CSV export
   * ------------------------------------------------------------------ */

  @Post('export')
  @Roles('operator_admin', 'regulator', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Export entity data as CSV' })
  @ApiResponse({ status: 201, description: 'CSV exported, returns file key' })
  @ApiResponse({ status: 400, description: 'No data found or invalid entity type' })
  async exportCsv(@Body() dto: CsvExportDto): Promise<{ fileKey: string }> {
    const fileKey = await this.exportService.exportCsv({
      tenantId: dto.tenantId,
      entityType: dto.entityType,
      filters: dto.filters,
      dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
      dateTo: dto.dateTo ? new Date(dto.dateTo) : undefined,
    });

    return { fileKey };
  }

  /* ------------------------------------------------------------------
   * POST /reports/da260/:period  — SARS DA 260 XML
   * ------------------------------------------------------------------ */

  @Post('da260/:period')
  @Roles('operator_admin', 'regulator', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate SARS DA 260 excise duty XML return' })
  @ApiResponse({ status: 201, description: 'DA 260 XML generated, returns file key' })
  @ApiResponse({ status: 400, description: 'Invalid period or no ledger entries' })
  async generateDa260(
    @Param() params: Da260ParamDto,
    @Body() body: Da260BodyDto,
  ): Promise<{ fileKey: string }> {
    const fileKey = await this.exportService.generateDa260Xml(body.tenantId, params.period);
    return { fileKey };
  }

  /* ------------------------------------------------------------------
   * POST /reports/incb-form-c/:year  — INCB Form C
   * ------------------------------------------------------------------ */

  @Post('incb-form-c/:year')
  @Roles('regulator', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate INCB Form C annual statistical return' })
  @ApiResponse({ status: 201, description: 'INCB Form C generated, returns file key' })
  @ApiResponse({ status: 400, description: 'Invalid year' })
  async generateIncbFormC(@Param() params: IncbFormCParamDto): Promise<{ fileKey: string }> {
    const fileKey = await this.exportService.generateIncbFormC(params.year);
    return { fileKey };
  }

  /* ------------------------------------------------------------------
   * POST /reports/download  — Download report by presigned URL
   * ------------------------------------------------------------------ */

  // POST instead of GET because fileKey contains '/' separators making route params problematic
  @Post('download')
  @Roles('operator_admin', 'regulator', 'inspector', 'auditor', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a presigned download URL for a generated report' })
  @ApiResponse({ status: 200, description: 'Presigned download URL' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadReport(
    @Body() body: DownloadParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ url: string }> {
    const url = await this.storageService.getDownloadUrl(body.fileKey, user.tenantId);
    return { url };
  }

  /* ------------------------------------------------------------------
   * GET /reports/history  — List previously generated reports
   * ------------------------------------------------------------------ */

  @Get('history')
  @Roles('operator_admin', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'List previously generated reports for a tenant' })
  @ApiResponse({ status: 200, description: 'List of generated reports' })
  async reportHistory(
    @Query() query: ReportHistoryQueryDto,
  ): Promise<{ reports: Array<Record<string, unknown>> }> {
    const { tenantId, limit = 50 } = query;
    const reports = await this.exportService.getReportHistory(tenantId, limit);
    return { reports };
  }
}
