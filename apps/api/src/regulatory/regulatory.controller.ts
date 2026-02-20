import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RegulatoryService } from './regulatory.service';

@ApiTags('regulatory')
@ApiBearerAuth()
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
  getOperators() {
    return this.regulatoryService.getOperators();
  }
}
