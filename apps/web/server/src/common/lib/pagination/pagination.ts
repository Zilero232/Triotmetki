import type { Paginated } from '@otmetki/schemas';

import type { PaginateInput } from './pagination.types';

export const paginate = async <T>({ limit, offset, fetch, count }: PaginateInput<T>): Promise<Paginated<T>> => {
  const [items, total] = await Promise.all([fetch({ take: limit, skip: offset }), count()]);

  return { items, total, limit, offset };
};
