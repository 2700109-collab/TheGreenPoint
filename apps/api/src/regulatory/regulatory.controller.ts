import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RegulatoryService } from './regulatory.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth';

@ApiTags('regulatory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('regulator', 'inspector')
@Controller({ path: 'regulatory', version: '1' })
export class RegulatoryController {
  constructor(private readonly regulatoryService: RegulatoryService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get regulatory dashboard KPIs' })
  getDashboard() {
    return this.regulatoryService.getDashboard();
  }

  @Get('dashboard/trends')
  @ApiOperation({ summary: 'Get dashboard trend data' })
  getTrends() {
    return this.regulatoryService.getTrends();
  }

  @Get('facilities/geo')
  @ApiOperation({ summary: 'Get facility GeoJSON for map' })
  getFacilitiesGeo() {
    return this.regulatoryService.getFacilitiesGeo();
  }

  @Get('operators')
  @ApiOperation({ summary: 'List operators with compliance scores' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getOperators(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.regulatoryService.getOperators(page, limit);
  }

  @Get('permits')
  @ApiOperation({ summary: 'List all permits with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'permitType', required: false, type: String })
  getPermits(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('permitType') permitType?: string,
  ) {
    return this.regulatoryService.getPermits(page, limit, status, permitType);
  }

  @Patch('permits/:id/status')
  @ApiOperation({ summary: 'Update permit status' })
  @Roles('regulator')
  updatePermitStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.regulatoryService.updatePermitStatus(id, body.status, body.notes);
  }

  @Get('compliance/alerts')
  @ApiOperation({ summary: 'Get compliance alerts across all operators' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getComplianceAlerts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.regulatoryService.getComplianceAlerts(page, limit);
  }
}
