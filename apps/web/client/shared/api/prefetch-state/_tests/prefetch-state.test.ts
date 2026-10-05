import type { QueryClient } from '@tanstack/react-query';

import { cacheLife } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';

import { UNAVAILABLE_CACHE_LIFE } from '../../query-client';
import { prefetchState } from '../prefetch-state';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));

const clanQuery = { queryKey: ['clan', 'RED'], queryFn: () => Promise.resolve({ tag: 'RED' }) };
const membersQuery = { queryKey: ['clan', 'RED', 'members'], queryFn: () => Promise.resolve([{ nickname: 'Tanker' }]) };

describe('prefetchState', () => {
  it('dehydrates every query the page fetched', async () => {
    const state = await prefetchState((client) => [client.fetchQuery(clanQuery), client.fetchQuery(membersQuery)]);

    expect(state?.queries.map((query) => [query.queryKey, query.state.data])).toEqual([
      [clanQuery.queryKey, { tag: 'RED' }],
      [membersQuery.queryKey, [{ nickname: 'Tanker' }]]
    ]);
  });

  it('keeps the queries that succeeded when another fetch fails', async () => {
    const missing = { queryKey: ['clan', 'NONE'], queryFn: () => Promise.reject(new Error('not found')) };

    const state = await prefetchState((client) => [client.fetchQuery(clanQuery), client.fetchQuery(missing)]);

    expect(state?.queries.map((query) => query.queryKey)).toEqual([clanQuery.queryKey]);
  });

  it('caches a partial prefetch only briefly, so the failed query is retried soon', async () => {
    const missing = { queryKey: ['clan', 'NONE'], queryFn: () => Promise.reject(new Error('not found')) };

    await prefetchState((client) => [client.fetchQuery(clanQuery), client.fetchQuery(missing)]);

    expect(cacheLife).toHaveBeenCalledWith(UNAVAILABLE_CACHE_LIFE);
  });

  it('returns no state when every fetch fails, so the page loads on the client and the build never needs the API', async () => {
    const missing = { queryKey: ['clan', 'NONE'], queryFn: () => Promise.reject(new Error('not found')) };
    const down = { queryKey: ['clan', 'DOWN'], queryFn: () => Promise.reject(new Error('down')) };

    await expect(prefetchState((client) => [client.fetchQuery(missing), client.fetchQuery(down)])).resolves.toBeNull();
  });

  it('keeps the regular cache life when every fetch succeeds', async () => {
    vi.mocked(cacheLife).mockClear();

    await prefetchState((client) => [client.fetchQuery(clanQuery)]);

    expect(cacheLife).not.toHaveBeenCalled();
  });

  it('never retries a failed fetch on the server', async () => {
    const queryFn = vi.fn(() => Promise.reject(new Error('down')));

    await expect(prefetchState((client) => [client.fetchQuery({ queryKey: ['down'], queryFn })])).resolves.toBeNull();
    expect(queryFn).toHaveBeenCalledOnce();
  });

  it('starts every request from an empty cache so one visitor never sees another visitor’s data', async () => {
    const clients: QueryClient[] = [];

    await prefetchState((client) => {
      clients.push(client);

      return [client.fetchQuery(clanQuery)];
    });

    const state = await prefetchState((client) => {
      clients.push(client);

      return [];
    });

    expect(clients[0]).not.toBe(clients[1]);
    expect(state?.queries).toEqual([]);
  });
});
