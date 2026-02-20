import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';

@ApiTags('facilities')
@ApiBearerAuth()
@Controller({ path: 'facilities', version: '1' })
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new facility' })
  create(@Body() dto: any) {
    return this.facilitiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List facilities for current tenant' })
  findAll() {
    return this.facilitiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility by ID' })
  findOne(@Param('id') id: string) {
    return this.facilitiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update facility' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.facilitiesService.update(id, dto);
  }
}
