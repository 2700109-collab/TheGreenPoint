import { Injectable } from '@nestjs/common';

@Injectable()
export class SalesService {
  create(dto: any) {
    return { message: 'Sale recording — not yet implemented', dto };
  }

  findAll(query: any) {
    return { message: 'Sales listing — not yet implemented', data: [], query };
  }
}
