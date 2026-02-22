import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { PopiaService } from './popia.service';
import { RecordConsentDto, DataDeletionRequestDto } from './dto';

/**
 * Section 8.2 — POPIA Compliance Controller
 *
 * Provides endpoints for consent management, subject access requests (SAR),
 * data deletion, data inventory, and privacy policy access.
 * All authenticated users can access their own POPIA data.
 */
@ApiTags('POPIA Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'popia', version: '1' })
export class PopiaController {
  constructor(private readonly popiaService: PopiaService) {}

  /**
   * POST /popia/consent — Record a consent decision.
   */
  @Post('consent')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'Record consent (grant or deny)' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async recordConsent(
    @Body() dto: RecordConsentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    return this.popiaService.recordConsent(user.id, user.role, dto, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  /**
   * GET /popia/consent — Get user's consent history.
   */
  @Get('consent')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: "Get user's consent history" })
  @ApiResponse({ status: 200, description: 'Consent history' })
  async getConsentHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.popiaService.getConsentHistory(user.id);
  }

  /**
   * PATCH /popia/consent/:id/withdraw — Withdraw a consent.
   */
  @Patch('consent/:id/withdraw')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'Withdraw consent' })
  @ApiResponse({ status: 200, description: 'Consent withdrawn' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async withdrawConsent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.popiaService.withdrawConsent(id, user.id, user.role);
  }

  /**
   * POST /popia/data-export — Request personal data export (Subject Access Request).
   */
  @Post('data-export')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'Request personal data export (SAR)' })
  @ApiResponse({ status: 201, description: 'Data export request created' })
  async requestDataExport(@CurrentUser() user: AuthenticatedUser) {
    return this.popiaService.requestDataExport(user.id, user.role);
  }

  /**
   * POST /popia/data-deletion — Request data deletion (right to erasure).
   */
  @Post('data-deletion')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'Request data deletion or anonymization' })
  @ApiResponse({ status: 201, description: 'Deletion request created' })
  async requestDataDeletion(
    @Body() dto: DataDeletionRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.popiaService.requestDataDeletion(user.id, user.role, dto);
  }

  /**
   * GET /popia/data-inventory — What personal data we hold about the user.
   */
  @Get('data-inventory')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'Get inventory of personal data held' })
  @ApiResponse({ status: 200, description: 'Data inventory' })
  async getDataInventory(@CurrentUser() user: AuthenticatedUser) {
    return this.popiaService.getDataInventory(user.id);
  }
}

/**
 * Public POPIA Controller — no authentication required.
 * Allows users to review the privacy policy before creating an account.
 */
@ApiTags('POPIA Compliance')
@Controller({ path: 'popia', version: '1' })
export class PopiaPublicController {
  constructor(private readonly popiaService: PopiaService) {}

  /**
   * GET /popia/privacy-policy — Get current privacy policy (public, no auth).
   */
  @Get('privacy-policy')
  @ApiOperation({ summary: 'Get current privacy policy (public, no auth required)' })
  @ApiResponse({ status: 200, description: 'Privacy policy' })
  getPrivacyPolicy() {
    return this.popiaService.getPrivacyPolicy();
  }
}
