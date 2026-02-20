import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BatchesService } from './batches.service';

@ApiTags('batches')
@ApiBearerAuth()
@Controller({ path: 'batches', version: '1' })
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @ApiOperation({ summary: 'List batches for current tenant' })
  findAll() {
    return this.batchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get batch by ID' })
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }
}
