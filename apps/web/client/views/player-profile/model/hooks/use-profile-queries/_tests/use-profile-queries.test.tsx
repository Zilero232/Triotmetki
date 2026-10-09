import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getPlayerHistory } from '@/entities/player/profile';

import { usePlayerHistory } from '../use-profile-queries';

type Viewer = { userId: string | null; isPlus: boolean };

vi.mock('@/views/player-profile/model/context/profile/profile-context', () => ({
  useProfileContext: () => ({ accountId: 42, nickname: 'Jove' })
}));

const viewer = vi.hoisted((): Viewer => ({ userId: null, isPlus: false }));

vi.mock('@/entities/auth/session', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuthSession: () => ({ data: viewer.userId ? { user: { id: viewer.userId } } : null })
}));

vi.mock('@/features/plus/plus-gate', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePlus: () => ({ isPlus: viewer.isPlus })
}));

vi.mock('@/entities/player/profile', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPlayerHistory: vi.fn(async () => ({ points: [] }))
}));

const renderHistory = (initial: Viewer) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  const setViewer = (next: Viewer) => {
    Object.assign(viewer, next);
  };

  setViewer(initial);

  const { rerender } = renderHook(() => usePlayerHistory({ metric: 'wn8', granularity: 'day' }), { wrapper });

  return {
    switchViewer: (next: Viewer) => {
      setViewer(next);
      rerender();
    }
  };
};

describe('usePlayerHistory', () => {
  it('loads the history again once the viewer signs out', async () => {
    vi.mocked(getPlayerHistory).mockClear();
    const { switchViewer } = renderHistory({ userId: 'owner', isPlus: true });

    await waitFor(() => expect(getPlayerHistory).toHaveBeenCalledTimes(1));
    switchViewer({ userId: null, isPlus: false });

    await waitFor(() => expect(getPlayerHistory).toHaveBeenCalledTimes(2));
  });

  it('loads the history again once the viewer starts Plus', async () => {
    vi.mocked(getPlayerHistory).mockClear();
    const { switchViewer } = renderHistory({ userId: 'owner', isPlus: false });

    await waitFor(() => expect(getPlayerHistory).toHaveBeenCalledTimes(1));
    switchViewer({ userId: 'owner', isPlus: true });

    await waitFor(() => expect(getPlayerHistory).toHaveBeenCalledTimes(2));
  });
});
