import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HarvestsService } from './harvests.service';

@ApiTags('harvests')
@ApiBearerAuth()
@Controller({ path: 'harvests', version: '1' })
export class HarvestsController {
  constructor(private readonly harvestsService: HarvestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a harvest event' })
  create(@Body() dto: any) {
    return this.harvestsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get harvest by ID' })
  findOne(@Param('id') id: string) {
    return this.harvestsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update harvest weights' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.harvestsService.update(id, dto);
  }
}
