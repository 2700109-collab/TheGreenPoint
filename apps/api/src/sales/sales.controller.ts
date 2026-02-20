import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@Controller({ path: 'sales', version: '1' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Record a retail sale' })
  create(@Body() dto: any) {
    return this.salesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sales with filters' })
  findAll(@Query() query: any) {
    return this.salesService.findAll(query);
  }
}
