import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RegulatoryService } from './regulatory.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, AuthenticatedUser } from '../auth';
import { UpdatePermitStatusDto } from './dto';

@ApiTags('regulatory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('regulator', 'inspector', 'super_admin')
@Controller({ path: 'regulatory', version: '1' })
export class RegulatoryController {
  constructor(private readonly regulatoryService: RegulatoryService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get regulatory dashboard KPIs' })
  getDashboard() {
    return this.regulatoryService.getDashboard();
  }

  @Get('dashboard/trends')
  @ApiOperation({ summary: 'Get dashboard trend data' })
  getTrends() {
    return this.regulatoryService.getTrends();
  }

  @Get('facilities/geo')
  @ApiOperation({ summary: 'Get facility GeoJSON for map' })
  getFacilitiesGeo() {
    return this.regulatoryService.getFacilitiesGeo();
  }

  @Get('operators')
  @ApiOperation({ summary: 'List operators with compliance scores' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getOperators(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.regulatoryService.getOperators(page, limit);
  }

  @Get('permits')
  @ApiOperation({ summary: 'List all permits with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'permitType', required: false, type: String })
  getPermits(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('permitType') permitType?: string,
  ) {
    return this.regulatoryService.getPermits(page, limit, status, permitType);
  }

  @Patch('permits/:id/status')
  @ApiOperation({ summary: 'Update permit status' })
  @Roles('regulator')
  updatePermitStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePermitStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.regulatoryService.updatePermitStatus(id, dto.status, dto.notes, user?.id, user?.role);
  }

  @Get('compliance/alerts')
  @ApiOperation({ summary: 'Get compliance alerts across all operators' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getComplianceAlerts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.regulatoryService.getComplianceAlerts(page, limit);
  }

  // =========================================================================
  // Section 7.4 — Regulatory Dashboard API Enhancements
  // =========================================================================

  @Get('dashboard/kpis')
  @ApiOperation({ summary: 'Get cached KPIs for the national dashboard' })
  getKpis() {
    return this.regulatoryService.getKpis();
  }

  @Get('dashboard/compliance-overview')
  @ApiOperation({ summary: 'Get compliance overview — alert breakdown by status and severity' })
  getComplianceOverview() {
    return this.regulatoryService.getComplianceOverview();
  }

  @Get('dashboard/alert-summary')
  @ApiOperation({ summary: 'Get alert summary — counts by type and severity' })
  getAlertSummary() {
    return this.regulatoryService.getAlertSummary();
  }

  @Get('dashboard/inspection-calendar')
  @ApiOperation({ summary: 'Get inspection calendar with upcoming/overdue inspections' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  getInspectionCalendar(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.regulatoryService.getInspectionCalendar(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('dashboard/production-trends')
  @ApiOperation({ summary: 'Get production trends — plants, harvests, batches, destruction' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getProductionTrends(
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ) {
    return this.regulatoryService.getProductionTrends(months);
  }

  @Get('dashboard/geographic')
  @ApiOperation({ summary: 'Get geographic summary — province-level aggregation' })
  getGeographicSummary() {
    return this.regulatoryService.getGeographicSummary();
  }

  @Get('operators/:tenantId/drill-down')
  @ApiOperation({ summary: 'Get detailed operator drill-down by tenant ID' })
  getOperatorDrillDown(@Param('tenantId') tenantId: string) {
    return this.regulatoryService.getOperatorDrillDown(tenantId);
  }

  @Get('reports/national-summary')
  @ApiOperation({ summary: 'Get national summary — system-wide high-level stats' })
  getNationalSummary() {
    return this.regulatoryService.getNationalSummary();
  }

  @Get('dashboard/municipal-summary')
  @ApiOperation({ summary: 'Get municipal summary — province-level license stats' })
  getMunicipalSummary() {
    return this.regulatoryService.getMunicipalSummary();
  }

  @Get('dashboard/municipal/:municipalityCode')
  @ApiOperation({ summary: 'Get drill-down for a specific municipality' })
  getMunicipalDrillDown(@Param('municipalityCode') municipalityCode: string) {
    return this.regulatoryService.getMunicipalDrillDown(municipalityCode);
  }
}
