import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BatchesService } from './batches.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import type { AuthenticatedUser } from '../auth';

@ApiTags('batches')
@ApiBearerAuth()
@Controller({ path: 'batches', version: '1' })
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

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
  ): Promise<any> {
    const tenantId = ['regulator', 'inspector', 'admin'].includes(user.role)
      ? undefined
      : user.tenantId;
    return this.batchesService.findOne(id, tenantId);
  }
}
