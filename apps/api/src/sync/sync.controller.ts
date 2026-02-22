import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, TenantId } from '../auth';
import { AuthenticatedUser } from '../auth/auth.service';
import { SyncService } from './sync.service';
import { SyncPushDto, SyncPullQueryDto } from './dto';

/**
 * Section 7.7 — Mobile Sync Controller
 *
 * WatermelonDB-compatible sync endpoints for offline-first mobile clients.
 */
@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * GET /sync/pull — Pull changes from server since lastPulledAt.
   * Returns WatermelonDB-format: { changes: { table: { created, updated, deleted } }, timestamp }
   */
  @Get('pull')
  @Roles('operator_admin', 'operator_staff', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Pull changes from server (WatermelonDB sync)' })
  @ApiResponse({ status: 200, description: 'Changes since lastPulledAt' })
  async pull(
    @Query() query: SyncPullQueryDto,
    @TenantId() tenantId: string,
  ) {
    return this.syncService.pull(tenantId, query.lastPulledAt, query.tables);
  }

  /**
   * POST /sync/push — Push offline changes to server.
   * Applies conflict resolution per table strategy.
   */
  @Post('push')
  @Roles('operator_admin', 'operator_staff', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Push offline changes to server (WatermelonDB sync)' })
  @ApiResponse({ status: 200, description: 'Push result with applied/conflict/error counts' })
  async push(
    @Body() dto: SyncPushDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() tenantId: string,
  ) {
    return this.syncService.push(tenantId, user.id, user.role, dto);
  }

  /**
   * GET /sync/reference-data — Get static/slow-changing lookup data.
   * Cached client-side for offline use.
   */
  @Get('reference-data')
  @Roles('operator_admin', 'operator_staff', 'inspector', 'super_admin')
  @ApiOperation({ summary: 'Get reference data for offline caching' })
  @ApiResponse({ status: 200, description: 'Strains, facilities, zones, excise rates' })
  async getReferenceData(@TenantId() tenantId: string) {
    return this.syncService.getReferenceData(tenantId);
  }
}
