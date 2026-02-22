import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, TenantId, CurrentUser } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { QrService } from './qr.service';
import { StorageService } from '../storage/storage.service';
import { BulkLabelsDto } from './dto';

/**
 * Section 7.6 — QR Code Controller
 *
 * Provides QR code generation endpoints for cannabis tracking.
 */
@ApiTags('QR Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qr')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * GET /qr/:batchId — Generate QR code SVG for a batch.
   * Returns SVG directly in the response body.
   */
  @Get(':batchId')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Generate QR code SVG for a batch' })
  @ApiQuery({ name: 'size', required: false, type: Number, description: 'QR code size in pixels (default: 256)' })
  @ApiResponse({ status: 200, description: 'SVG QR code' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  @Header('Content-Type', 'image/svg+xml')
  async getQrSvg(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Query('size', new DefaultValuePipe(256), ParseIntPipe) size: number,
  ) {
    return this.qrService.generateBatchQrSvg(batchId, size);
  }

  /**
   * GET /qr/:batchId/label — Generate a single Avery-format label PDF.
   * Returns a presigned download URL.
   */
  @Get(':batchId/label')
  @Roles('operator_admin', 'operator_staff', 'super_admin')
  @ApiOperation({ summary: 'Generate Avery-format label PDF for a batch' })
  @ApiResponse({ status: 200, description: 'Presigned download URL for the label PDF' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getLabel(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const fileKey = await this.qrService.generateAveryLabel(batchId);
    const downloadUrl = await this.storageService.getDownloadUrl(fileKey, user.tenantId);
    return { fileKey, downloadUrl };
  }

  /**
   * POST /qr/bulk — Generate bulk label PDF for multiple batches.
   * Returns a presigned download URL.
   */
  @Post('bulk')
  @Roles('operator_admin', 'super_admin')
  @ApiOperation({ summary: 'Generate bulk label PDF for multiple batches' })
  @ApiResponse({ status: 201, description: 'Presigned download URL for the bulk PDF' })
  async bulkLabels(
    @Body() dto: BulkLabelsDto,
    @TenantId() tenantId: string,
  ) {
    const fileKey = await this.qrService.generateBulkLabels(dto.batchIds, tenantId);
    const downloadUrl = await this.storageService.getDownloadUrl(fileKey, tenantId);
    return { fileKey, downloadUrl };
  }
}
