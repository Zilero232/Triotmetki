import type { QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useResetUserQueries } from '@/entities/auth/session';
import { SESSION_REQUEST } from '@/shared/api/http';
import { supertestControllerMineOptions } from '@/shared/api/query-options';
import { QUERY_KEYS } from '@/shared/constants';

const VIEWER_KEYS: Record<string, QueryKey> = {
  competitions: QUERY_KEYS.competitions.list({ mine: true }),
  competitionDetail: QUERY_KEYS.competitions.detail({ slug: 'cup', code: 'SECRET' }),
  replays: QUERY_KEYS.replays.list({ page: 1 }),
  replayDetail: QUERY_KEYS.replays.detail('replay-1'),
  supertestMine: supertestControllerMineOptions({ ...SESSION_REQUEST }).queryKey
};

const PUBLIC_KEY = QUERY_KEYS.tanks.catalog;

const resetWithCache = () => {
  const client = new QueryClient();

  Object.values(VIEWER_KEYS).forEach((queryKey) => client.setQueryData(queryKey, { cached: true }));
  client.setQueryData(PUBLIC_KEY, { cached: true });

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useResetUserQueries(), { wrapper });

  result.current();

  return client;
};

describe('useResetUserQueries', () => {
  it.each(Object.entries(VIEWER_KEYS))('drops the cached %s query of the previous viewer', (_name, queryKey) => {
    const client = resetWithCache();

    expect(client.getQueryData(queryKey)).toBeUndefined();
  });

  it('keeps the public cache', () => {
    const client = resetWithCache();

    expect(client.getQueryData(PUBLIC_KEY)).toEqual({ cached: true });
  });
});
