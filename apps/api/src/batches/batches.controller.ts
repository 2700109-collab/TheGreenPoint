import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BatchesService } from './batches.service';
import { JwtAuthGuard, RolesGuard, TenantGuard, Roles, CurrentUser, TenantId } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { CreateBatchDto, UpdateBatchDto } from './dto';

@ApiTags('batches')
@ApiBearerAuth()
@Controller({ path: 'batches', version: '1' })
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Create a processed/packaged/extracted batch' })
  create(@TenantId() tenantId: string, @Body() dto: CreateBatchDto) {
    return this.batchesService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List batches' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (['regulator', 'inspector', 'admin'].includes(user.role)) {
      return this.batchesService.findAllForRegulator(page, limit);
    }
    return this.batchesService.findAll(user.tenantId!, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get batch by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tenantId = ['regulator', 'inspector', 'admin'].includes(user.role)
      ? undefined
      : user.tenantId;
    return this.batchesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Update batch details' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchesService.update(id, tenantId, dto);
  }
}
