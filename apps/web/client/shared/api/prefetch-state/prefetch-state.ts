import { dehydrate } from '@tanstack/react-query';
import { cacheLife } from 'next/cache';

import type { PrefetchQueries } from './prefetch-state.types';

import { makeServerQueryClient, UNAVAILABLE_CACHE_LIFE } from '../query-client';

import 'server-only';

export const prefetchState = async (fetch: PrefetchQueries) => {
  const client = makeServerQueryClient();
  const results = await Promise.allSettled(fetch(client));
  const failed = results.filter((result) => result.status === 'rejected').length;

  if (failed > 0) {
    cacheLife(UNAVAILABLE_CACHE_LIFE);
  }

  if (failed > 0 && failed === results.length) {
    return null;
  }

  return dehydrate(client);
};
