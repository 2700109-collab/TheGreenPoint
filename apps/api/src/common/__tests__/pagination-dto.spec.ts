import { describe, it } from 'vitest';
import { expectValid, expectInvalid } from '@test/helpers/dto-validator';
import { PaginationQueryDto, SortableQueryDto } from '../dto/pagination.dto';

describe('PaginationQueryDto', () => {
  it('accepts empty (all optional)', async () => {
    await expectValid(PaginationQueryDto, {});
  });

  it('accepts valid page and limit', async () => {
    await expectValid(PaginationQueryDto, { page: 1, limit: 20 });
  });

  it('rejects page < 1', async () => {
    await expectInvalid(PaginationQueryDto, { page: 0 }, ['page']);
  });

  it('rejects limit > 100', async () => {
    await expectInvalid(PaginationQueryDto, { limit: 200 }, ['limit']);
  });

  it('rejects limit < 1', async () => {
    await expectInvalid(PaginationQueryDto, { limit: 0 }, ['limit']);
  });
});

describe('SortableQueryDto', () => {
  it('accepts empty', async () => {
    await expectValid(SortableQueryDto, {});
  });

  it('accepts sort string', async () => {
    await expectValid(SortableQueryDto, { sort: 'created_at:desc' });
  });

  it('inherits pagination', async () => {
    await expectValid(SortableQueryDto, { page: 2, limit: 50, sort: 'name:asc' });
  });
});
