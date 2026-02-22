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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlantingIntentionsService } from './planting-intentions.service';
import {
  CreatePlantingIntentionDto,
  UpdatePlantingIntentionDto,
  PlantingIntentionFilterDto,
} from './dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';

/**
 * Section 8.3 — Planting Intentions Controller
 *
 * DALRRD planting intention lifecycle:
 * (1) Operator creates draft
 * (2) Operator updates / edits draft
 * (3) Operator submits for acknowledgment
 * (4) Regulator acknowledges submitted intentions
 */
@ApiTags('Planting Intentions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'planting-intentions', version: '1' })
export class PlantingIntentionsController {
  constructor(private readonly plantingIntentionsService: PlantingIntentionsService) {}

  /**
   * POST /planting-intentions — create a new planting intention (draft).
   */
  @Post()
  @Roles('operator_admin', 'super_admin')
  @ApiOperation({ summary: 'Create a planting intention (draft)' })
  @ApiResponse({ status: 201, description: 'Planting intention created' })
  async create(
    @Body() dto: CreatePlantingIntentionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantingIntentionsService.create(user.tenantId!, dto, user.id, user.role);
  }

  /**
   * GET /planting-intentions — list planting intentions.
   * Regulators/inspectors/auditors see all; operators see their tenant's only.
   */
  @Get()
  @Roles('operator_admin', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'List planting intentions with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated planting intentions' })
  async findAll(
    @Query() filter: PlantingIntentionFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isGlobal = ['regulator', 'inspector', 'auditor', 'super_admin'].includes(user.role);
    return this.plantingIntentionsService.findAll(
      isGlobal ? null : user.tenantId!,
      filter,
    );
  }

  /**
   * GET /planting-intentions/:id — get a single planting intention.
   */
  @Get(':id')
  @Roles('operator_admin', 'regulator', 'inspector', 'auditor', 'super_admin')
  @ApiOperation({ summary: 'Get a single planting intention' })
  @ApiParam({ name: 'id', description: 'Planting intention UUID' })
  @ApiResponse({ status: 200, description: 'Planting intention detail' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isGlobal = ['regulator', 'inspector', 'auditor', 'super_admin'].includes(user.role);
    return this.plantingIntentionsService.findOne(id, isGlobal ? null : user.tenantId!);
  }

  /**
   * PATCH /planting-intentions/:id — update a draft planting intention.
   */
  @Patch(':id')
  @Roles('operator_admin', 'super_admin')
  @ApiOperation({ summary: 'Update a draft planting intention' })
  @ApiParam({ name: 'id', description: 'Planting intention UUID' })
  @ApiResponse({ status: 200, description: 'Planting intention updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlantingIntentionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantingIntentionsService.update(id, user.tenantId!, dto, user.id, user.role);
  }

  /**
   * POST /planting-intentions/:id/submit — submit a draft for acknowledgment.
   */
  @Post(':id/submit')
  @Roles('operator_admin', 'super_admin')
  @ApiOperation({ summary: 'Submit a draft planting intention for acknowledgment' })
  @ApiParam({ name: 'id', description: 'Planting intention UUID' })
  @ApiResponse({ status: 200, description: 'Planting intention submitted' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantingIntentionsService.submit(id, user.tenantId!, user.id, user.role);
  }

  /**
   * POST /planting-intentions/:id/acknowledge — regulator acknowledges a submitted intention.
   */
  @Post(':id/acknowledge')
  @Roles('regulator', 'super_admin')
  @ApiOperation({ summary: 'Acknowledge a submitted planting intention' })
  @ApiParam({ name: 'id', description: 'Planting intention UUID' })
  @ApiResponse({ status: 200, description: 'Planting intention acknowledged' })
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantingIntentionsService.acknowledge(id, user.id, user.role);
  }
}
