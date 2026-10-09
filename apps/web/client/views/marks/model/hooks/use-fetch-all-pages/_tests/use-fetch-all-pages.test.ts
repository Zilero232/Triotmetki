import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFetchAllPages } from '@/views/marks/model/hooks/use-fetch-all-pages';

describe('useFetchAllPages', () => {
  it('fetches the next page while one is left', () => {
    const fetchNextPage = vi.fn();

    renderHook(() => useFetchAllPages({ hasNextPage: true, isFetchingNextPage: false, isFetchNextPageError: false, fetchNextPage }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('stops after a next page failed instead of requesting it again', () => {
    const fetchNextPage = vi.fn();
    const { rerender } = renderHook(
      (props: { isFetchingNextPage: boolean; isFetchNextPageError: boolean }) => useFetchAllPages({ hasNextPage: true, fetchNextPage, ...props }),
      { initialProps: { isFetchingNextPage: true, isFetchNextPageError: false } }
    );

    rerender({ isFetchingNextPage: false, isFetchNextPageError: true });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
