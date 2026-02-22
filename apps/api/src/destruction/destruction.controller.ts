import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, TenantId } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { DestructionService } from './destruction.service';
import { CreateDestructionDto, DestructionFilterDto, ApproveDestructionDto } from './dto';

/**
 * Section 7.2 — Destruction & Disposal Controller
 *
 * Endpoints for recording and managing cannabis destruction events.
 */
@ApiTags('Destruction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('destruction')
export class DestructionController {
  constructor(private readonly destructionService: DestructionService) {}

  /**
   * POST /destruction — Record a new destruction event.
   */
  @Post()
  @Roles('operator_admin', 'operator_staff', 'super_admin')
  @ApiOperation({ summary: 'Record a cannabis destruction event' })
  @ApiResponse({ status: 201, description: 'Destruction event recorded' })
  @ApiResponse({ status: 400, description: 'Validation error (witnesses, entities)' })
  async create(
    @Body() dto: CreateDestructionDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() tenantId: string,
  ) {
    return this.destructionService.create(dto, user.id, user.role, tenantId);
  }

  /**
   * GET /destruction — List destruction events with filters.
   */
  @Get()
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'super_admin', 'auditor')
  @ApiOperation({ summary: 'List destruction events with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated destruction event list' })
  async list(
    @Query() filter: DestructionFilterDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() tenantId: string,
  ) {
    // Regulators/inspectors see all; operators see only their tenant
    const filteredTenantId =
      user.role === 'regulator' || user.role === 'inspector' || user.role === 'super_admin'
        ? undefined
        : tenantId;
    return this.destructionService.findAll(filter, filteredTenantId);
  }

  /**
   * GET /destruction/:id — Get destruction event details.
   */
  @Get(':id')
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector', 'super_admin', 'auditor')
  @ApiOperation({ summary: 'Get destruction event details by ID' })
  @ApiResponse({ status: 200, description: 'Destruction event details' })
  @ApiResponse({ status: 404, description: 'Destruction event not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.destructionService.findOne(id);
  }

  /**
   * POST /destruction/:id/approve — Regulatory approval of a destruction event.
   */
  @Post(':id/approve')
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Approve a destruction event (regulator)' })
  @ApiResponse({ status: 200, description: 'Destruction event approved' })
  @ApiResponse({ status: 404, description: 'Destruction event not found' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDestructionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.destructionService.approve(id, user.id, user.role, dto.notes);
  }
}
