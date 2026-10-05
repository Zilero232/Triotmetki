import type { z } from 'zod';

import type { sortOrderSchema } from './query.schemas';

export type SortOrder = z.infer<typeof sortOrderSchema>;
export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
