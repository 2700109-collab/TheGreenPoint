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
import { TransfersService } from './transfers.service';
import { JwtAuthGuard, RolesGuard, TenantGuard, Roles, CurrentUser, TenantId } from '../auth';
import type { AuthenticatedUser } from '../auth';

@ApiTags('transfers')
@ApiBearerAuth()
@Controller({ path: 'transfers', version: '1' })
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin')
  @ApiOperation({ summary: 'Initiate a transfer (digital manifest)' })
  create(@TenantId() tenantId: string, @Body() dto: any): Promise<any> {
    return this.transfersService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'List transfers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (['regulator', 'inspector'].includes(user.role)) {
      return this.transfersService.findAllForRegulator(page, limit);
    }
    return this.transfersService.findAll(user.tenantId!, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator_admin', 'operator_staff', 'regulator', 'inspector')
  @ApiOperation({ summary: 'Get transfer by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    const tenantId = ['regulator', 'inspector'].includes(user.role) ? undefined : user.tenantId;
    return this.transfersService.findOne(id, tenantId);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin')
  @ApiOperation({ summary: 'Accept a transfer' })
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: any,
  ): Promise<any> {
    return this.transfersService.accept(id, tenantId, dto);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('operator_admin')
  @ApiOperation({ summary: 'Reject a transfer' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: any,
  ): Promise<any> {
    return this.transfersService.reject(id, tenantId, dto);
  }
}
