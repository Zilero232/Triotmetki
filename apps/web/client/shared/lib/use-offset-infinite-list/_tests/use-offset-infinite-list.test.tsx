import type { QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { OffsetListFetchInput } from '../use-offset-infinite-list.types';

import { useOffsetInfiniteList } from '../use-offset-infinite-list';

const ALL = ['a', 'b', 'c', 'd', 'e'];
const LIMIT = 2;

const createWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const fetchPage = ({ offset }: OffsetListFetchInput) => Promise.resolve({ items: ALL.slice(offset, offset + LIMIT), total: ALL.length, offset });

describe('useOffsetInfiniteList', () => {
  it('flattens pages and stops once everything is loaded', async () => {
    const queryFn = vi.fn(fetchPage);
    const { result } = renderHook(() => useOffsetInfiniteList({ queryKey: ['letters'], queryFn }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items).toEqual(['a', 'b']);
    expect(result.current.total).toBe(5);
    expect(result.current.hasNextPage).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toEqual(['a', 'b', 'c', 'd']));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toEqual(ALL));
    expect(result.current.hasNextPage).toBe(false);
    expect(queryFn.mock.calls.map(([input]) => input.offset)).toEqual([0, 2, 4]);
  });

  it('reports an error with no items', async () => {
    const queryFn = vi.fn(() => Promise.reject(new Error('down')));
    const { result } = renderHook(() => useOffsetInfiniteList<string>({ queryKey: ['broken'], queryFn }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('hands the query state no data when the first page fails, so it shows the error with a retry', async () => {
    const queryFn = vi.fn(() => Promise.reject(new Error('down')));
    const { result } = renderHook(() => useOffsetInfiniteList<string>({ queryKey: ['broken'], queryFn }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.query.isError).toBe(true));

    expect(result.current.query.data).toBeUndefined();
  });

  it('keeps the loaded items while the filters of the same list change', async () => {
    const { result, rerender } = renderHook(({ queryKey }: { queryKey: QueryKey }) => useOffsetInfiniteList({ queryKey, queryFn: fetchPage }), {
      wrapper: createWrapper(),
      initialProps: { queryKey: ['letters', 'list', { from: 'a' }] }
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    rerender({ queryKey: ['letters', 'list', { from: 'b' }] });

    expect(result.current.items).toEqual(['a', 'b']);
  });

  it('shows no items of another list while the new one loads', async () => {
    const { result, rerender } = renderHook(({ queryKey }: { queryKey: QueryKey }) => useOffsetInfiniteList({ queryKey, queryFn: fetchPage }), {
      wrapper: createWrapper(),
      initialProps: { queryKey: ['letters', 'mine', {}] }
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    rerender({ queryKey: ['letters', 'list', {}] });

    expect(result.current.items).toEqual([]);
  });
});
