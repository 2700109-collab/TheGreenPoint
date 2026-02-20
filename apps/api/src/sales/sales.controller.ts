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
import { SalesService } from './sales.service';
import { JwtAuthGuard, RolesGuard, TenantGuard, Roles, CurrentUser, TenantId } from '../auth';
import type { AuthenticatedUser } from '../auth';

@ApiTags('sales')
@ApiBearerAuth()
@Controller({ path: 'sales', version: '1' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin', 'operator_staff')
  @ApiOperation({ summary: 'Record a retail sale' })
  create(@TenantId() tenantId: string, @Body() dto: any): Promise<any> {
    return this.salesService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List sales with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'facilityId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('facilityId') facilityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (['regulator', 'inspector'].includes(user.role)) {
      return this.salesService.findAllForRegulator(page, limit);
    }
    return this.salesService.findAll(user.tenantId!, page, limit, { facilityId, dateFrom, dateTo });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get sale by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    const tenantId = ['regulator', 'inspector'].includes(user.role) ? undefined : user.tenantId;
    return this.salesService.findOne(id, tenantId);
  }
}
