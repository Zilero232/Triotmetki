import { queryOptions } from '@tanstack/react-query';

import { PREFETCHED_STALE_TIME } from '@/shared/api/query-client';
import { QUERY_KEYS } from '@/shared/constants';

import { getPulse } from '../pulse';

export const pulseQueries = {
  current: () => queryOptions({ queryKey: QUERY_KEYS.pulse, queryFn: ({ signal }) => getPulse({ signal }), staleTime: PREFETCHED_STALE_TIME })
};
