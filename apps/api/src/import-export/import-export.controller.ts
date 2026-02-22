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
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, TenantId } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { ImportExportService } from './import-export.service';
import {
  CreateImportExportDto,
  ImportExportFilterDto,
  UpdateImportExportStatusDto,
} from './dto';

/**
 * Section 7.3 — Import/Export Controller
 *
 * Endpoints for managing international cannabis import/export records.
 */
@ApiTags('Import/Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('import-export')
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  /**
   * POST /import-export — Create a new import/export record.
   */
  @Post()
  @Roles('operator_admin', 'super_admin')
  @ApiOperation({ summary: 'Create an import/export record' })
  @ApiResponse({ status: 201, description: 'Record created' })
  @ApiResponse({ status: 400, description: 'Permit validation failed or quota exceeded' })
  async create(
    @Body() dto: CreateImportExportDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() tenantId: string,
  ) {
    return this.importExportService.create(dto, user.id, user.role, tenantId);
  }

  /**
   * GET /import-export — List records with filters.
   */
  @Get()
  @Roles('operator_admin', 'regulator', 'inspector', 'super_admin', 'auditor')
  @ApiOperation({ summary: 'List import/export records with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated record list' })
  async list(
    @Query() filter: ImportExportFilterDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() tenantId: string,
  ) {
    const filteredTenantId =
      user.role === 'regulator' || user.role === 'inspector' || user.role === 'super_admin'
        ? undefined
        : tenantId;
    return this.importExportService.findAll(filter, filteredTenantId);
  }

  /**
   * GET /import-export/quota — Get INCB quota summary for the current year.
   */
  @Get('quota')
  @Roles('operator_admin', 'regulator', 'super_admin')
  @ApiOperation({ summary: 'Get INCB quota summary (imports/exports by country)' })
  @ApiResponse({ status: 200, description: 'Quota summary' })
  async getQuota(@TenantId() tenantId: string) {
    return this.importExportService.getQuotaSummary(tenantId);
  }

  /**
   * GET /import-export/:id — Get a single record.
   */
  @Get(':id')
  @Roles('operator_admin', 'regulator', 'inspector', 'super_admin', 'auditor')
  @ApiOperation({ summary: 'Get import/export record details' })
  @ApiResponse({ status: 200, description: 'Record details' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.importExportService.findOne(id);
  }

  /**
   * PATCH /import-export/:id/status — Update status (e.g., in_transit → completed).
   */
  @Patch(':id/status')
  @Roles('operator_admin', 'regulator', 'super_admin')
  @ApiOperation({ summary: 'Update import/export record status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImportExportStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importExportService.updateStatus(
      id,
      dto.status,
      dto.customsDeclarationNumber,
      user.id,
      user.role,
    );
  }
}
