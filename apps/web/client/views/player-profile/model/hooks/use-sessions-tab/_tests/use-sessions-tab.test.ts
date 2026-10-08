import { useMediaQuery } from '@siberiacancode/reactuse';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSessionsTab } from '../use-sessions-tab';

vi.mock('@siberiacancode/reactuse', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMediaQuery: vi.fn()
}));

vi.mock('@/views/player-profile/model/context/profile/profile-context', () => ({
  useProfileContext: () => ({ accountId: 42, nickname: 'Jove' })
}));

vi.mock('@/views/player-profile/model/hooks/use-profile-queries/use-profile-queries', () => ({
  usePlayerSessions: () => ({ data: { items: [{ id: 'first' }], total: 1 } })
}));

const selectOnScreen = (isStacked: boolean) => {
  vi.mocked(useMediaQuery).mockReturnValue(isStacked);
  const scrollIntoView = vi.fn();
  const { result } = renderHook(() => useSessionsTab());
  const detail = document.createElement('div');

  detail.scrollIntoView = scrollIntoView;
  result.current.detailRef.current = detail;
  act(() => result.current.select('second'));

  return { result, scrollIntoView };
};

describe('useSessionsTab', () => {
  it('opens the picked session', () => {
    const { result } = selectOnScreen(false);

    expect(result.current.selectedId).toBe('second');
  });

  it('brings the session detail into view when the list and detail are stacked', () => {
    const { scrollIntoView } = selectOnScreen(true);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('leaves the scroll alone when the detail sits beside the list', () => {
    const { scrollIntoView } = selectOnScreen(false);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
