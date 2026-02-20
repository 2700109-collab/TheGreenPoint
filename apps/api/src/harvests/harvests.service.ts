import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PlantState, BatchType } from '@ncts/shared-types';
import type { CreateHarvestDto } from '@ncts/shared-types';

@Injectable()
export class HarvestsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateBatchNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BATCH-${year}`;
    const lastBatch = await this.prisma.batch.findFirst({
      where: { batchNumber: { startsWith: prefix } },
      orderBy: { batchNumber: 'desc' },
      select: { batchNumber: true },
    });

    let seq = 1;
    if (lastBatch) {
      const parts = lastBatch.batchNumber.split('-');
      seq = parseInt(parts[2] || '0', 10) + 1;
    }

    return `${prefix}-${String(seq).padStart(6, '0')}`;
  }

  async create(tenantId: string, dto: CreateHarvestDto) {
    // Validate all plants exist, belong to tenant, and are in FLOWERING state
    const plants = await this.prisma.plant.findMany({
      where: { id: { in: dto.plantIds }, tenantId },
    });

    if (plants.length !== dto.plantIds.length) {
      throw new BadRequestException(
        `Some plants not found. Found ${plants.length} of ${dto.plantIds.length}`,
      );
    }

    const nonFlowering = plants.filter((p) => p.state !== PlantState.FLOWERING);
    if (nonFlowering.length > 0) {
      throw new BadRequestException(
        `Plants must be in FLOWERING state to harvest. Invalid: ${nonFlowering.map((p) => p.trackingId).join(', ')}`,
      );
    }

    // Get the strain from the first plant (all should be same strain for a harvest)
    const firstPlant = plants[0]!;
    const batchNumber = await this.generateBatchNumber();

    // Create batch + harvest in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create the batch
      const batch = await tx.batch.create({
        data: {
          tenantId,
          batchNumber,
          batchType: BatchType.HARVEST,
          strainId: firstPlant.strainId,
          facilityId: dto.facilityId,
          plantCount: dto.plantIds.length,
          wetWeightGrams: dto.wetWeightGrams,
          dryWeightGrams: dto.dryWeightGrams || null,
          createdDate: new Date(dto.harvestDate),
        },
      });

      // Create the harvest record
      const harvest = await tx.harvest.create({
        data: {
          tenantId,
          batchId: batch.id,
          facilityId: dto.facilityId,
          harvestDate: new Date(dto.harvestDate),
          wetWeightGrams: dto.wetWeightGrams,
          dryWeightGrams: dto.dryWeightGrams || null,
          plantIds: dto.plantIds,
          notes: dto.notes || null,
        },
        include: {
          batch: true,
          facility: { select: { id: true, name: true } },
        },
      });

      // Transition all plants to HARVESTED and link to batch
      await tx.plant.updateMany({
        where: { id: { in: dto.plantIds } },
        data: {
          state: PlantState.HARVESTED,
          harvestedDate: new Date(dto.harvestDate),
          batchId: batch.id,
        },
      });

      return harvest;
    });
  }

  async findOne(id: string, tenantId?: string): Promise<any> {
    const where = tenantId ? { id, tenantId } : { id };
    const harvest = await this.prisma.harvest.findFirst({
      where,
      include: {
        batch: {
          include: {
            strain: { select: { id: true, name: true } },
            labResult: true,
          },
        },
        facility: { select: { id: true, name: true } },
      },
    });

    if (!harvest) {
      throw new NotFoundException(`Harvest ${id} not found`);
    }

    return harvest;
  }

  async update(id: string, tenantId: string, dto: { dryWeightGrams?: number; notes?: string }) {
    await this.findOne(id, tenantId);

    return this.prisma.harvest.update({
      where: { id },
      data: {
        ...(dto.dryWeightGrams !== undefined && { dryWeightGrams: dto.dryWeightGrams }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        batch: true,
        facility: { select: { id: true, name: true } },
      },
    });
  }
}
