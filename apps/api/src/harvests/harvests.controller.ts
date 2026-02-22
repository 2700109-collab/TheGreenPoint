import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HarvestsService } from './harvests.service';
import { JwtAuthGuard, TenantGuard, RolesGuard, Roles, CurrentUser, TenantId } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { CreateHarvestDto, UpdateHarvestDto, HarvestFilterDto } from './dto';

@ApiTags('harvests')
@ApiBearerAuth()
@Controller({ path: 'harvests', version: '1' })
export class HarvestsController {
  constructor(private readonly harvestsService: HarvestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Create a harvest event' })
  create(@TenantId() tenantId: string, @Body() dto: CreateHarvestDto) {
    return this.harvestsService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List harvests with filtering & pagination' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: HarvestFilterDto) {
    const tenantId = ['regulator', 'inspector', 'admin'].includes(user.role)
      ? undefined
      : user.tenantId;
    return this.harvestsService.findAll(tenantId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get harvest by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tenantId = ['regulator', 'inspector', 'admin'].includes(user.role)
      ? undefined
      : user.tenantId;
    return this.harvestsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Update harvest weights' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateHarvestDto,
  ) {
    return this.harvestsService.update(id, tenantId, dto);
  }
}
