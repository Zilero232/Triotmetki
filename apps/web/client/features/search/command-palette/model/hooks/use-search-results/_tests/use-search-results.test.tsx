import type { ClanSearchResult, PlayerSearchResult, SearchResponse, SearchResult } from '@otmetki/schemas';
import type { ReactNode } from 'react';

import { SEARCH } from '@otmetki/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { search } from '@/entities/search/search/api/search/search';
import { SEARCH_REQUEST } from '@/entities/search/search/api/search/search.constants';

import { useSearchResults } from '../use-search-results';

vi.hoisted(() => vi.resetModules());

vi.mock('@/entities/search/search/api/search/search', () => ({ search: vi.fn() }));

const QUERY = 'jove';

const PLAYER: PlayerSearchResult = {
  kind: 'player',
  accountId: 1001,
  nickname: 'Jove',
  clanTag: null,
  matchedNickname: null,
  wn8: { value: null, tier: null },
  battles: null
};

const CLAN: ClanSearchResult = { kind: 'clan', clanId: 7, tag: 'JOVE', name: 'Jove Team', membersCount: 30, emblem: null };

const MAP: SearchResult = { kind: 'map', arenaId: '01_karelia', slug: 'karelia', name: 'Karelia', image: null };

const RESPONSE: SearchResponse = { query: QUERY, correctedQuery: null, results: [PLAYER, MAP, CLAN] };

const createWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const renderSearch = (query: string) => renderHook((value: string) => useSearchResults(value), { initialProps: query, wrapper: createWrapper() });

const settle = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  vi.resetModules();
});

describe('useSearchResults', () => {
  it('does not search a query shorter than the minimum once trimmed', async () => {
    const { result } = renderSearch(` ${QUERY.slice(0, SEARCH.minLength - 1)} `);

    await settle(SEARCH_REQUEST.debounceMs);

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.results).toBeUndefined();
    expect(search).not.toHaveBeenCalled();
  });

  it('waits for the debounce before searching the trimmed query', async () => {
    vi.mocked(search).mockResolvedValue(RESPONSE);
    const { result, rerender } = renderSearch('');

    rerender(`  ${QUERY}  `);
    await settle(SEARCH_REQUEST.debounceMs - 1);
    expect(search).not.toHaveBeenCalled();

    await settle(1);

    expect(search).toHaveBeenCalledWith(expect.objectContaining({ query: QUERY }));
    expect(result.current.isEnabled).toBe(true);
  });

  it('searches only the last value typed within the debounce window', async () => {
    vi.mocked(search).mockResolvedValue(RESPONSE);
    const { rerender } = renderSearch('');

    rerender('jo');
    await settle(SEARCH_REQUEST.debounceMs / 2);
    rerender('jov');
    await settle(SEARCH_REQUEST.debounceMs / 2);
    rerender(QUERY);
    await settle(SEARCH_REQUEST.debounceMs);

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ query: QUERY }));
  });

  it('groups players and clans and counts only the grouped results', async () => {
    vi.mocked(search).mockResolvedValue(RESPONSE);
    const { result } = renderSearch(QUERY);

    await settle(SEARCH_REQUEST.debounceMs);

    expect(result.current.results).toEqual({ players: [PLAYER], tanks: [], clans: [CLAN] });
    expect(result.current.total).toBe(2);
    expect(result.current.isFetching).toBe(false);
  });

  it('drops the previous results once the query becomes too short', async () => {
    vi.mocked(search).mockResolvedValue(RESPONSE);
    const { result, rerender } = renderSearch(QUERY);

    await settle(SEARCH_REQUEST.debounceMs);
    rerender('j');
    await settle(SEARCH_REQUEST.debounceMs);

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.results).toBeUndefined();
    expect(result.current.total).toBe(0);
  });

  it('reports a failed search and retries it on demand', async () => {
    vi.mocked(search).mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(RESPONSE);
    const { result } = renderSearch(QUERY);

    await settle(SEARCH_REQUEST.debounceMs);
    expect(result.current.isError).toBe(true);

    await act(async () => {
      await result.current.retry();
    });

    await settle(0);

    expect(result.current.isError).toBe(false);
    expect(result.current.total).toBe(2);
  });

  it('hides the previous results while the next query is being searched', async () => {
    vi.mocked(search)
      .mockResolvedValueOnce(RESPONSE)
      .mockReturnValueOnce(new Promise(() => undefined));

    const { result, rerender } = renderSearch(QUERY);

    await settle(SEARCH_REQUEST.debounceMs);

    rerender('karelia');

    expect(result.current.results).toBeUndefined();
  });

  it('keeps hiding the previous results until the next answer arrives', async () => {
    vi.mocked(search)
      .mockResolvedValueOnce(RESPONSE)
      .mockReturnValueOnce(new Promise(() => undefined));

    const { result, rerender } = renderSearch(QUERY);

    await settle(SEARCH_REQUEST.debounceMs);

    rerender('karelia');
    await settle(SEARCH_REQUEST.debounceMs);

    expect(result.current.results).toBeUndefined();
    expect(result.current.isFetching).toBe(true);
  });
});
