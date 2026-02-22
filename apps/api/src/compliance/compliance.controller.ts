import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, AuthenticatedUser } from '../auth';
import { ComplianceEngine } from './engine/compliance-engine';
import { ComplianceScoreService } from './scoring/compliance-score.service';
import { InventoryReconciliationService, type ReconciliationReport } from './inventory/inventory-reconciliation.service';
import { DiversionDetectorService, type DiversionReport } from './diversion/diversion-detector.service';
import { AlertEscalationService } from './escalation/alert-escalation.service';
import { PrismaService } from '../database/prisma.service';
import {
  CreateRuleDto,
  UpdateRuleDto,
  AlertFilterDto,
  UpdateAlertDto,
  InventorySnapshotDto,
} from './dto';

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'compliance', version: '1' })
export class ComplianceController {
  constructor(
    private readonly complianceEngine: ComplianceEngine,
    private readonly complianceScoreService: ComplianceScoreService,
    private readonly inventoryService: InventoryReconciliationService,
    private readonly diversionService: DiversionDetectorService,
    private readonly alertEscalationService: AlertEscalationService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Rules ───────────────────────────────────────────────────────────

  @Get('rules')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'List all compliance rules' })
  async listRules() {
    return this.prisma.complianceRule.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Post('rules')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'Create a new compliance rule' })
  async createRule(@Body() dto: CreateRuleDto) {
    return this.prisma.complianceRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        severity: dto.severity,
        evaluationType: dto.evaluationType,
        ruleDefinition: dto.ruleDefinition as unknown as Prisma.InputJsonValue,
        thresholds: (dto.thresholds ?? {}) as unknown as Prisma.InputJsonValue,
        escalationPolicy: (dto.escalationPolicy ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  @Patch('rules/:id')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'Toggle rule active/inactive or update thresholds' })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.prisma.complianceRule.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.thresholds && { thresholds: dto.thresholds as unknown as Prisma.InputJsonValue }),
        ...(dto.escalationPolicy && { escalationPolicy: dto.escalationPolicy as unknown as Prisma.InputJsonValue }),
      },
    });
  }

  // ─── Alerts ──────────────────────────────────────────────────────────

  @Get('alerts')
  @Roles('regulator', 'super_admin', 'operator_admin')
  @ApiOperation({ summary: 'List compliance alerts with optional filters' })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'facilityId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listAlerts(@Query() filter: AlertFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const where: Prisma.ComplianceAlertWhereInput = {};

    if (filter.severity) where.severity = filter.severity;
    if (filter.status) where.status = filter.status;
    if (filter.tenantId) where.tenantId = filter.tenantId;
    if (filter.facilityId) where.facilityId = filter.facilityId;

    const [alerts, total] = await Promise.all([
      this.prisma.complianceAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { rule: true },
      }),
      this.prisma.complianceAlert.count({ where }),
    ]);

    return {
      data: alerts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  @Get('alerts/:id')
  @Roles('regulator', 'super_admin', 'operator_admin')
  @ApiOperation({ summary: 'Get alert detail' })
  async getAlert(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.complianceAlert.findUniqueOrThrow({
      where: { id },
      include: { rule: true },
    });
  }

  @Patch('alerts/:id')
  @Roles('regulator', 'super_admin', 'operator_admin')
  @ApiOperation({ summary: 'Acknowledge or resolve an alert' })
  async updateAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data: Prisma.ComplianceAlertUpdateInput = { status: dto.status };

    if (dto.status === 'resolved') {
      data.resolvedAt = new Date();
      data.resolvedBy = user.id;
      if (dto.resolutionNotes) data.resolutionNotes = dto.resolutionNotes;
    }

    if (dto.assignedTo) data.assignedTo = dto.assignedTo;

    return this.prisma.complianceAlert.update({
      where: { id },
      data,
    });
  }

  @Post('alerts/:id/escalate')
  @Roles('regulator', 'super_admin', 'operator_admin')
  @ApiOperation({ summary: 'Manually escalate an alert' })
  async escalateAlert(@Param('id', ParseUUIDPipe) id: string) {
    const alert = await this.prisma.complianceAlert.findUniqueOrThrow({
      where: { id },
    });
    return this.alertEscalationService.processNewAlert(alert);
  }

  // ─── Scores ──────────────────────────────────────────────────────────

  @Get('score/:tenantId')
  @ApiOperation({ summary: 'Get compliance score for a tenant' })
  async getScore(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.complianceScoreService.getScore(tenantId);
  }

  // ─── Inventory Reconciliation ────────────────────────────────────────

  @Post('inventory-reconciliation')
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Submit manual inventory reconciliation' })
  async reconcileInventory(
    @Body() dto: InventorySnapshotDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReconciliationReport> {
    const tenantId = user.tenantId ?? '';
    return this.inventoryService.reconcile(tenantId, dto.facilityId, dto.items);
  }

  // ─── Evaluation ──────────────────────────────────────────────────────

  @Post('evaluate/:tenantId')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'Trigger full compliance evaluation for a tenant' })
  async evaluateTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    const results = await this.complianceEngine.evaluateAll(tenantId);
    return {
      tenantId,
      evaluatedAt: new Date().toISOString(),
      rulesEvaluated: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    };
  }

  // ─── Diversion Detection ────────────────────────────────────────────

  @Get('diversion-report/:tenantId')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'Get diversion detection report for a tenant' })
  async getDiversionReport(@Param('tenantId', ParseUUIDPipe) tenantId: string): Promise<DiversionReport> {
    return this.diversionService.generateReport(tenantId);
  }
}
