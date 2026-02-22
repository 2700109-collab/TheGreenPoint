import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LabResultsService, type LabResultDetail } from './lab-results.service';
import type { LabResult } from '@prisma/client';
import { JwtAuthGuard, RolesGuard, TenantGuard, Roles, CurrentUser, TenantId } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { SubmitLabResultDto } from './dto';

@ApiTags('lab-results')
@ApiBearerAuth()
@Controller({ path: 'lab-results', version: '1' })
export class LabResultsController {
  constructor(private readonly labResultsService: LabResultsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('lab_technician', 'operator_admin')
  @ApiOperation({ summary: 'Submit Certificate of Analysis (CoA)' })
  create(@TenantId() tenantId: string, @Body() dto: SubmitLabResultDto) {
    return this.labResultsService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'lab_technician', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List lab results' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.labResultsService.findAll(user.tenantId!, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'lab_technician', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get lab result by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LabResultDetail> {
    const tenantId = ['regulator', 'inspector'].includes(user.role) ? undefined : user.tenantId;
    return this.labResultsService.findOne(id, tenantId);
  }

  @Get('batch/:batchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'lab_technician', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get lab results for a batch' })
  findByBatch(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LabResult> {
    const tenantId = ['regulator', 'inspector'].includes(user.role) ? undefined : user.tenantId;
    return this.labResultsService.findByBatch(batchId, tenantId);
  }
}
