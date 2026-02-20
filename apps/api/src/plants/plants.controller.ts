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
import { PlantsService } from './plants.service';
import { JwtAuthGuard, TenantGuard, RolesGuard, Roles, CurrentUser, TenantId } from '../auth';
import type { AuthenticatedUser } from '../auth';

@ApiTags('plants')
@ApiBearerAuth()
@Controller({ path: 'plants', version: '1' })
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Register a new plant' })
  create(@TenantId() tenantId: string, @Body() dto: any) {
    return this.plantsService.create(tenantId, dto);
  }

  @Post('batch-register')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Bulk register plants' })
  batchCreate(@TenantId() tenantId: string, @Body() dto: any) {
    return this.plantsService.batchCreate(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List plants with filtering & pagination' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: any) {
    if (['regulator', 'inspector', 'admin'].includes(user.role)) {
      return this.plantsService.findAllForRegulator(query);
    }
    return this.plantsService.findAll(user.tenantId!, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get plant by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tenantId = ['regulator', 'inspector', 'admin'].includes(user.role)
      ? undefined
      : user.tenantId;
    return this.plantsService.findOne(id, tenantId);
  }

  @Patch(':id/state')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Transition plant lifecycle state' })
  updateState(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: any,
  ) {
    return this.plantsService.updateState(id, tenantId, dto);
  }
}
