import { Injectable } from '@nestjs/common';

@Injectable()
export class HarvestsService {
  create(dto: any) {
    return { message: 'Harvest creation — not yet implemented', dto };
  }

  findOne(id: string) {
    return { message: 'Harvest detail — not yet implemented', id };
  }

  update(id: string, dto: any) {
    return { message: 'Harvest update — not yet implemented', id, dto };
  }
}
