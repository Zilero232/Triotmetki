import type { ReplayFilters } from '@/entities/replay/replay';

import type { useReplaysBrowser } from './use-replays-browser';

export type UseReplaysBrowserInput = {
  page: unknown;
  enabled: boolean;
  now: number;
};

export type FilterPatch = Partial<ReplayFilters>;

export type ReplaysBrowserModel = ReturnType<typeof useReplaysBrowser>;
