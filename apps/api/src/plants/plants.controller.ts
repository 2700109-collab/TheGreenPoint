import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlantsService } from './plants.service';

@ApiTags('plants')
@ApiBearerAuth()
@Controller({ path: 'plants', version: '1' })
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new plant' })
  create(@Body() dto: any) {
    return this.plantsService.create(dto);
  }

  @Post('batch-register')
  @ApiOperation({ summary: 'Bulk register plants via CSV upload' })
  batchCreate(@Body() dto: any) {
    return this.plantsService.batchCreate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List plants with filtering & pagination' })
  findAll(@Query() query: any) {
    return this.plantsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plant by ID' })
  findOne(@Param('id') id: string) {
    return this.plantsService.findOne(id);
  }

  @Patch(':id/state')
  @ApiOperation({ summary: 'Transition plant lifecycle state' })
  updateState(@Param('id') id: string, @Body() dto: any) {
    return this.plantsService.updateState(id, dto);
  }
}
