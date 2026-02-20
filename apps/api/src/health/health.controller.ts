import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  check() {
    return {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
        eventBridge: 'up',
      },
    };
  }
}
