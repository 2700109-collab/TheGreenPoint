import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, TenantId, CurrentUser } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { ExciseDutyService } from './excise.service';
import { CreateExciseRateDto, ExciseLedgerFilterDto } from './dto';

/**
 * Section 8.1 — Excise Duty Controller
 *
 * Endpoints for excise rate management, duty summaries,
 * ledger entries, and SARS DA 260 generation.
 */
@ApiTags('Excise Duty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'excise', version: '1' })
export class ExciseController {
  constructor(private readonly exciseService: ExciseDutyService) {}

  /**
   * GET /excise/rates — List active excise rates.
   */
  @Get('rates')
  @Roles('operator_admin', 'regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'List active excise rates' })
  @ApiResponse({ status: 200, description: 'Active rates' })
  async listRates() {
    return this.exciseService.listRates();
  }

  /**
   * POST /excise/rates — Create or update an excise rate.
   * Deactivates existing rate for the same category.
   */
  @Post('rates')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'Create a new excise rate (deactivates existing for same category)' })
  @ApiResponse({ status: 201, description: 'Rate created' })
  async createRate(
    @Body() dto: CreateExciseRateDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() tenantId: string,
  ) {
    return this.exciseService.createRate(dto, user.id, user.role, tenantId);
  }

  /**
   * GET /excise/summary/:period — Period summary of excise duty for the operator.
   */
  @Get('summary/:period')
  @Roles('operator_admin', 'regulator', 'super_admin', 'auditor')
  @ApiOperation({ summary: 'Get excise duty summary for a reporting period' })
  @ApiParam({ name: 'period', description: 'Reporting period in YYYY-MM format' })
  @ApiResponse({ status: 200, description: 'Period summary' })
  async getSummary(
    @Param('period') period: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isGlobal = ['regulator', 'auditor', 'super_admin'].includes(user.role);
    return this.exciseService.getExciseSummary(isGlobal ? null : tenantId, period);
  }

  /**
   * GET /excise/ledger — Detailed excise ledger entries with pagination.
   */
  @Get('ledger')
  @Roles('operator_admin', 'regulator', 'super_admin', 'auditor')
  @ApiOperation({ summary: 'List excise ledger entries' })
  @ApiResponse({ status: 200, description: 'Paginated ledger entries' })
  async getLedger(
    @Query() filter: ExciseLedgerFilterDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isGlobal = ['regulator', 'auditor', 'super_admin'].includes(user.role);
    return this.exciseService.getLedgerEntries(isGlobal ? null : tenantId, filter);
  }

  /**
   * POST /excise/da260/:period — Generate SARS DA 260 excise duty return.
   */
  @Post('da260/:period')
  @Roles('operator_admin', 'super_admin')
  @ApiOperation({ summary: 'Generate SARS DA 260 excise duty return' })
  @ApiParam({ name: 'period', description: 'Reporting period in YYYY-MM format' })
  @ApiResponse({ status: 201, description: 'DA 260 return data' })
  async generateDa260(
    @Param('period') period: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exciseService.generateDa260(tenantId, period, user.id, user.role);
  }
}
