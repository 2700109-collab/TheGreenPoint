import { Injectable } from '@nestjs/common';

@Injectable()
export class BatchesService {
  findAll() {
    return { message: 'Batch listing — not yet implemented', data: [] };
  }

  findOne(id: string) {
    return { message: 'Batch detail — not yet implemented', id };
  }
}
