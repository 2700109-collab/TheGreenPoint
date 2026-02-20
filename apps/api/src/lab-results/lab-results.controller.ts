import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LabResultsService } from './lab-results.service';

@ApiTags('lab-results')
@ApiBearerAuth()
@Controller({ path: 'lab-results', version: '1' })
export class LabResultsController {
  constructor(private readonly labResultsService: LabResultsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit Certificate of Analysis (CoA)' })
  create(@Body() dto: any) {
    return this.labResultsService.create(dto);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get lab results for a batch' })
  findByBatch(@Param('batchId') batchId: string) {
    return this.labResultsService.findByBatch(batchId);
  }
}
