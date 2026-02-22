import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section 7.5 — DTO for suspicious report submission (public endpoint).
 */
class ReportSuspiciousDto {
  @ApiProperty({ description: 'Tracking ID from the QR code' })
  @IsString()
  trackingId!: string;

  @ApiProperty({ description: 'Reason for suspicion' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Reporter contact info for follow-up' })
  @IsString()
  @IsOptional()
  reporterContact?: string;

  @ApiPropertyOptional({ description: 'Reporter latitude' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Reporter longitude' })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

@ApiTags('verification')
@Controller({ path: 'verify', version: '1' })
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * GET /verify/:trackingId — Public product verification.
   * Section 7.5: Enhanced with scan logging and full lab results.
   */
  @Get(':trackingId')
  @ApiOperation({ summary: 'Verify a product by tracking ID (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Product verification data with lab results' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  verify(@Param('trackingId') trackingId: string, @Req() req: FastifyRequest) {
    const xff = req.headers?.['x-forwarded-for'];
    return this.verificationService.verify(trackingId, {
      ip: req.ip || (Array.isArray(xff) ? xff[0] : xff),
      userAgent: req.headers?.['user-agent'],
    });
  }

  /**
   * POST /verify/report — Public suspicious activity report.
   * Section 7.5: Creates a SuspiciousReport record with IP/geolocation.
   */
  @Post('report-suspicious')
  @ApiOperation({ summary: 'Report a suspicious product (public endpoint)' })
  @ApiResponse({ status: 201, description: 'Report created' })
  report(@Body() body: ReportSuspiciousDto, @Req() req: FastifyRequest) {
    const xff = req.headers?.['x-forwarded-for'];
    return this.verificationService.reportSuspicious(
      body.trackingId,
      body.reason,
      {
        ip: req.ip || (Array.isArray(xff) ? xff[0] : xff),
        contact: body.reporterContact,
        latitude: body.latitude,
        longitude: body.longitude,
      },
    );
  }

  // =========================================================================
  // Protected endpoints (regulator/inspector only)
  // =========================================================================

  /**
   * GET /verify/reports/suspicious — List suspicious reports.
   */
  @Get('reports/suspicious')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List suspicious activity reports (regulator/inspector only)' })
  @ApiResponse({ status: 200, description: 'Paginated suspicious reports' })
  getSuspiciousReports(
    @Query('trackingId') trackingId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.verificationService.getSuspiciousReports(trackingId, page, limit);
  }

  /**
   * GET /verify/scans/:trackingId — Get scan history for a tracking ID.
   */
  @Get('scans/:trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scan history for a tracking ID (regulator/inspector only)' })
  @ApiResponse({ status: 200, description: 'Scan history events' })
  getScanHistory(@Param('trackingId') trackingId: string) {
    return this.verificationService.getScanHistory(trackingId);
  }
}
