import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class VerificationService {
  verify(trackingId: string) {
    // TODO: Phase 4 — implement real lookup
    // For now, return a mock response for development
    if (!trackingId.startsWith('NCTS-ZA-')) {
      throw new NotFoundException(
        `Invalid tracking ID format: ${trackingId}`,
      );
    }

    return {
      trackingId,
      productName: 'Sample Cannabis Product',
      strain: 'Durban Poison',
      operatorName: 'GreenFields Cultivation (Pty) Ltd',
      batchNumber: 'BATCH-2026-000001',
      labResult: {
        status: 'pass',
        thcPercent: 18.5,
        cbdPercent: 0.8,
        testDate: '2026-02-15',
        labName: 'SA Cannabis Testing Laboratory',
      },
      chainOfCustody: [
        {
          from: 'GreenFields Cultivation',
          to: 'SA Cannabis Labs',
          date: '2026-02-10',
        },
        {
          from: 'SA Cannabis Labs',
          to: 'GreenFields Cultivation',
          date: '2026-02-15',
        },
        {
          from: 'GreenFields Cultivation',
          to: 'Cape Cannabis Dispensary',
          date: '2026-02-18',
        },
      ],
      verifiedAt: new Date().toISOString(),
    };
  }
}
