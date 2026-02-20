import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@ApiBearerAuth()
@Controller({ path: 'transfers', version: '1' })
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a transfer (digital manifest)' })
  create(@Body() dto: any) {
    return this.transfersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transfers' })
  findAll() {
    return this.transfersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer by ID' })
  findOne(@Param('id') id: string) {
    return this.transfersService.findOne(id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a transfer' })
  accept(@Param('id') id: string, @Body() dto: any) {
    return this.transfersService.accept(id, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a transfer' })
  reject(@Param('id') id: string, @Body() dto: any) {
    return this.transfersService.reject(id, dto);
  }
}
