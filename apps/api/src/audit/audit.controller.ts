import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, AuthenticatedUser } from '../auth';
import { AuditService } from './audit.service';
import { AuditQueryDto, AuditVerifyDto, AuditExportDto } from './dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ─── Section 4.3 — Paginated Audit Log ───────────────────────────

  @Get()
  @Roles('regulator', 'super_admin', 'operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Query audit events with filters' })
  @ApiOkResponse({ description: 'Paginated audit events with inline verification' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async queryAuditEvents(
    @Query() dto: AuditQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Operators can only see their own tenant's events
    const effectiveTenantId =
      user?.role === 'operator_admin' || user?.role === 'operator_staff'
        ? user.tenantId
        : dto.tenantId;

    return this.auditService.query({
      tenantId: effectiveTenantId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action,
      actorId: dto.actorId,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
      page: dto.page,
      limit: dto.limit,
    });
  }

  // ─── Section 4.2 — Chain Verification ────────────────────────────

  @Get('verify')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'Verify audit hash chain integrity' })
  @ApiOkResponse({ description: 'Chain verification result with broken links' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient role — regulator only' })
  async verifyChain(@Query() dto: AuditVerifyDto) {
    return this.auditService.verifyChain({
      tenantId: dto.tenantId,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
    });
  }

  // ─── Section 4.3 — CSV Export ────────────────────────────────────

  @Get('export')
  @Roles('regulator', 'super_admin', 'operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Export audit events as CSV' })
  @ApiOkResponse({ description: 'CSV file download' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async exportCsv(
    @Query() dto: AuditExportDto,
    @Res({ passthrough: true }) res: FastifyReply,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveTenantId =
      user?.role === 'operator_admin' || user?.role === 'operator_staff'
        ? user.tenantId
        : dto.tenantId;

    const fromDate = dto.from || '2020-01-01';
    const toDate = dto.to || new Date().toISOString().slice(0, 10);

    const csv = await this.auditService.exportCsv({
      tenantId: effectiveTenantId,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
    });

    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename="audit-${fromDate}-to-${toDate}.csv"`,
    );
    return csv;
  }
}
