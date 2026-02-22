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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { JwtAuthGuard, TenantGuard, RolesGuard, Roles, CurrentUser, TenantId } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { CreateFacilityDto, UpdateFacilityDto, CreateZoneDto } from './dto';

@ApiTags('facilities')
@ApiBearerAuth()
@Controller({ path: 'facilities', version: '1' })
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin')
  @ApiOperation({ summary: 'Register a new facility' })
  create(@TenantId() tenantId: string, @Body() dto: CreateFacilityDto) {
    return this.facilitiesService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List facilities' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (['regulator', 'inspector', 'admin'].includes(user.role)) {
      return this.facilitiesService.findAllForRegulator(page, limit);
    }
    return this.facilitiesService.findAll(user.tenantId!, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get facility by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tenantId = ['regulator', 'inspector', 'admin'].includes(user.role)
      ? undefined
      : user.tenantId;
    return this.facilitiesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin')
  @ApiOperation({ summary: 'Update facility' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(id, tenantId, dto);
  }

  @Post(':id/zones')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin')
  @ApiOperation({ summary: 'Create a zone within a facility' })
  createZone(
    @Param('id', ParseUUIDPipe) facilityId: string,
    @TenantId() tenantId: string,
    @Body() dto: CreateZoneDto,
  ) {
    return this.facilitiesService.createZone(facilityId, tenantId, dto);
  }

  @Get(':id/zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List zones in a facility' })
  getZones(
    @Param('id', ParseUUIDPipe) facilityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tenantId = ['regulator', 'inspector', 'admin'].includes(user.role)
      ? undefined
      : user.tenantId;
    return this.facilitiesService.getZones(facilityId, tenantId);
  }
}
