import { Injectable } from '@nestjs/common';

@Injectable()
export class PlantsService {
  create(dto: any) {
    return { message: 'Plant registration — not yet implemented', dto };
  }

  batchCreate(dto: any) {
    return { message: 'Batch plant registration — not yet implemented', dto };
  }

  findAll(query: any) {
    return { message: 'Plant listing — not yet implemented', data: [], query };
  }

  findOne(id: string) {
    return { message: 'Plant detail — not yet implemented', id };
  }

  updateState(id: string, dto: any) {
    return { message: 'Plant state transition — not yet implemented', id, dto };
  }
}
