import { cacheLife } from 'next/cache';

import { TANK_DETAIL } from '@/entities/tank/tank';
import { prefetchState } from '@/shared/api/prefetch-state';
import { PREFETCH_CACHE_LIFE } from '@/shared/api/query-client';

import { buildQueries } from '../build-queries';

export const buildPageState = async (slug: string) => {
  'use cache';
  cacheLife(PREFETCH_CACHE_LIFE);

  return prefetchState((client) => [
    client
      .fetchQuery(buildQueries.tank({ idOrSlug: slug, period: TANK_DETAIL.period }))
      .then(({ vehicle }) => client.fetchQuery(buildQueries.options(vehicle.tankId)))
  ]);
};
