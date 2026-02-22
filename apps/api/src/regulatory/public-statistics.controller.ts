import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicStatisticsService } from './public-statistics.service';

/**
 * Section 8.4 — Public Statistics Controller
 *
 * Public endpoint — NO authentication required.
 * Returns only aggregate national statistics with province-level
 * suppression to prevent operator identification.
 */
@ApiTags('public')
@Controller({ path: 'public', version: '1' })
export class PublicStatisticsController {
  constructor(
    private readonly publicStatisticsService: PublicStatisticsService,
  ) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get aggregate national cannabis statistics (public, no auth)' })
  getStatistics() {
    return this.publicStatisticsService.getStatistics();
  }
}
