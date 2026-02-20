import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateLabResultDto, PaginatedResponse } from '@ncts/shared-types';

@Injectable()
export class LabResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLabResultDto): Promise<any> {
    // Verify batch exists and belongs to tenant
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, tenantId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${dto.batchId} not found`);
    }

    if (batch.labResultId) {
      throw new BadRequestException(`Batch ${dto.batchId} already has lab results assigned`);
    }

    // Determine overall pass/fail
    const allPass = dto.pesticidesPass && dto.heavyMetalsPass && dto.microbialsPass && dto.mycotoxinsPass;
    const status = allPass ? 'pass' : 'fail';

    // Create in transaction: lab result + link to batch
    return this.prisma.$transaction(async (tx) => {
      const labResult = await tx.labResult.create({
        data: {
          tenantId,
          labName: dto.labName,
          labAccreditationNumber: dto.labAccreditationNumber,
          testDate: new Date(dto.testDate),
          status,
          thcPercent: dto.thcPercent,
          cbdPercent: dto.cbdPercent,
          cbnPercent: dto.cbnPercent,
          cbgPercent: dto.cbgPercent,
          totalCannabinoidsPercent: dto.totalCannabinoidsPercent,
          pesticidesPass: dto.pesticidesPass,
          heavyMetalsPass: dto.heavyMetalsPass,
          microbialsPass: dto.microbialsPass,
          mycotoxinsPass: dto.mycotoxinsPass,
          terpeneProfile: dto.terpeneProfile ? JSON.parse(JSON.stringify(dto.terpeneProfile)) : undefined,
          moisturePercent: dto.moisturePercent,
        },
      });

      // Link result to batch
      await tx.batch.update({
        where: { id: dto.batchId },
        data: { labResultId: labResult.id },
      });

      return labResult;
    });
  }

  async findByBatch(batchId: string, tenantId?: string): Promise<any> {
    const batch = await this.prisma.batch.findFirst({
      where: tenantId ? { id: batchId, tenantId } : { id: batchId },
      include: {
        labResult: true,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    if (!batch.labResult) {
      throw new NotFoundException(`No lab results found for batch ${batchId}`);
    }

    return batch.labResult;
  }

  async findAll(tenantId: string, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.labResult.findMany({
        where: { tenantId },
        include: {
          batches: { select: { id: true, batchNumber: true } },
        },
        skip,
        take: limit,
        orderBy: { testDate: 'desc' },
      }),
      this.prisma.labResult.count({ where: { tenantId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId?: string): Promise<any> {
    const where = tenantId ? { id, tenantId } : { id };
    const labResult = await this.prisma.labResult.findFirst({
      where,
      include: {
        batches: {
          select: { id: true, batchNumber: true, batchType: true },
        },
      },
    });

    if (!labResult) {
      throw new NotFoundException(`Lab result ${id} not found`);
    }

    return labResult;
  }
}
