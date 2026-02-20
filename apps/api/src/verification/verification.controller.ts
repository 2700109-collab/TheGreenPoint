import { Controller, Get, Param } from '@nestjs/common';
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
}
