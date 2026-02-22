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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { InspectionsService } from './inspections.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CompleteInspectionDto,
  InspectionFilterDto,
} from './dto';

/**
 * Section 7.1 — Inspections Controller
 *
 * Endpoints for managing facility inspections.
 * Restricted to regulator and inspector roles.
 */
@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  /**
   * POST /inspections — Schedule a new inspection.
   * Inspector or regulator specifies facility, type, date.
   */
  @Post()
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Schedule a new facility inspection' })
  @ApiResponse({ status: 201, description: 'Inspection scheduled' })
  async schedule(
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inspectionsService.schedule(dto, user.id, user.role);
  }

  /**
   * GET /inspections — List inspections with filters.
   */
  @Get()
  @Roles('regulator', 'inspector', 'super_admin', 'operator_admin', 'auditor')
  @ApiOperation({ summary: 'List inspections with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated inspection list' })
  async list(@Query() filter: InspectionFilterDto) {
    return this.inspectionsService.findAll(filter);
  }

  /**
   * GET /inspections/checklist — Return the standard inspection checklist template.
   */
  @Get('checklist')
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Get the standard SAHPRA/DALRRD inspection checklist' })
  @ApiResponse({ status: 200, description: 'Standard checklist items' })
  getChecklist() {
    return this.inspectionsService.getStandardChecklist();
  }

  /**
   * GET /inspections/:id — Get a single inspection with full details.
   */
  @Get(':id')
  @Roles('regulator', 'inspector', 'super_admin', 'operator_admin', 'auditor')
  @ApiOperation({ summary: 'Get inspection details by ID' })
  @ApiResponse({ status: 200, description: 'Inspection details' })
  @ApiResponse({ status: 404, description: 'Inspection not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inspectionsService.findOne(id);
  }

  /**
   * PATCH /inspections/:id — Update a scheduled inspection (reschedule, re-prioritize, cancel).
   */
  @Patch(':id')
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Update inspection details' })
  @ApiResponse({ status: 200, description: 'Inspection updated' })
  @ApiResponse({ status: 400, description: 'Cannot update completed inspection' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInspectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inspectionsService.update(id, dto, user.id, user.role);
  }

  /**
   * POST /inspections/:id/start — Inspector begins an inspection on-site.
   */
  @Post(':id/start')
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Start an inspection (transition to in_progress)' })
  @ApiResponse({ status: 200, description: 'Inspection started' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inspectionsService.start(id, user.id, user.role);
  }

  /**
   * POST /inspections/:id/complete — Complete an inspection with checklist and findings.
   */
  @Post(':id/complete')
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Complete an inspection with checklist and outcome' })
  @ApiResponse({ status: 200, description: 'Inspection completed, report generated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteInspectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inspectionsService.complete(id, dto, user.id, user.role);
  }

  /**
   * POST /inspections/:id/photos — Return pre-signed upload URLs for inspection photos.
   * Inspector calls this before uploading photos to S3.
   */
  @Post(':id/photos')
  @Roles('regulator', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Get pre-signed upload URLs for inspection photos' })
  @ApiResponse({ status: 200, description: 'Pre-signed URLs returned' })
  @ApiResponse({ status: 404, description: 'Inspection not found' })
  async getPhotoUploadUrls(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { filenames: string[] },
  ) {
    return this.inspectionsService.generatePhotoUploadUrls(id, body.filenames);
  }
}
