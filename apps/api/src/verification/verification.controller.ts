import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VerificationService } from './verification.service';

@ApiTags('verification')
@Controller({ path: 'verify', version: '1' })
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get(':trackingId')
  @ApiOperation({ summary: 'Verify a product by tracking ID (public endpoint)' })
  verify(@Param('trackingId') trackingId: string) {
    return this.verificationService.verify(trackingId);
  }

  @Post('report')
  @ApiOperation({ summary: 'Report a suspicious product (public endpoint)' })
  report(@Body() body: { trackingId: string; reason: string }) {
    return this.verificationService.reportSuspicious(body.trackingId, body.reason);
  }
}
