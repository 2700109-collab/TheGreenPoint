import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ProductVerificationDto } from '@ncts/shared-types';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(trackingId: string): Promise<ProductVerificationDto> {
    if (!trackingId.startsWith('NCTS-ZA-')) {
      throw new NotFoundException(
        `Invalid tracking ID format: ${trackingId}`,
      );
    }

    // Look up the plant by tracking ID
    const plant = await this.prisma.plant.findUnique({
      where: { trackingId },
      include: {
        strain: { select: { name: true, type: true } },
        batch: {
          include: {
            labResult: true,
            facility: { select: { name: true } },
          },
        },
        tenant: { select: { name: true, tradingName: true } },
        facility: { select: { name: true } },
      },
    });

    if (!plant) {
      throw new NotFoundException(`Product with tracking ID ${trackingId} not found`);
    }

    // Build chain of custody from transfer records related to this batch
    const chainOfCustody: { from: string; to: string; date: string }[] = [];

    if (plant.batch) {
      const transferItems = await this.prisma.transferItem.findMany({
        where: { batchId: plant.batch.id },
        include: {
          transfer: {
            select: {
              senderTenantId: true,
              receiverTenantId: true,
              status: true,
              initiatedAt: true,
              completedAt: true,
            },
          },
        },
      });

      for (const item of transferItems) {
        if (item.transfer.status === 'accepted' || item.transfer.status === 'pending') {
          // Resolve tenant names
          const [sender, receiver] = await Promise.all([
            this.prisma.tenant.findUnique({
              where: { id: item.transfer.senderTenantId },
              select: { tradingName: true, name: true },
            }),
            this.prisma.tenant.findUnique({
              where: { id: item.transfer.receiverTenantId },
              select: { tradingName: true, name: true },
            }),
          ]);

          chainOfCustody.push({
            from: sender?.tradingName || sender?.name || 'Unknown',
            to: receiver?.tradingName || receiver?.name || 'Unknown',
            date: (item.transfer.completedAt ?? item.transfer.initiatedAt).toISOString().split('T')[0] as string,
          });
        }
      }
    }

    const operatorName = plant.tenant.tradingName || plant.tenant.name;
    const labResult = plant.batch?.labResult;

    return {
      trackingId,
      productName: `${plant.strain.name} (${plant.strain.type})`,
      strain: plant.strain.name,
      operatorName,
      batchNumber: plant.batch?.batchNumber ?? 'N/A',
      labResult: labResult
        ? {
            status: labResult.status,
            thcPercent: labResult.thcPercent,
            cbdPercent: labResult.cbdPercent,
            testDate: labResult.testDate.toISOString().split('T')[0] as string,
            labName: labResult.labName,
          }
        : null,
      chainOfCustody,
      verifiedAt: new Date().toISOString(),
    };
  }
}
