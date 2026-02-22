import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check — tests database, Redis, and S3 connectivity' })
  @ApiResponse({
    status: 200,
    description: 'Service health status with per-service checks',
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
