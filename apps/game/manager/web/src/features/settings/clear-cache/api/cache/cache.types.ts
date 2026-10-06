import type { z } from 'zod';

import type { cachePlanSchema } from './cache.schemas';

export type CacheTarget = z.infer<typeof cachePlanSchema>['targets'][number];

export type ClearCacheInput = {
  clientPath: string | null;
  ids: string[];
};
