'use client';

import { match } from 'ts-pattern';

import { useCommunityViewer } from '@/entities/auth/session';
import { listMyReplays, listReplays } from '@/entities/replay/replay';
import { QUERY_KEYS } from '@/shared/constants';
import { useOffsetInfiniteList } from '@/shared/lib';

import { REPLAY_LIST } from '../../../config';
import { hasActiveFilters, toSearchQuery } from '../../../lib/replay-query';
import { useReplayFilters } from '../use-replay-filters';

export const useReplaysFeed = () => {
  const { tab, filters, setTab, reset } = useReplayFilters();
  const { isSignedIn } = useCommunityViewer();
  const activeTab = isSignedIn ? tab : REPLAY_LIST.defaultTab;
  const isMine = activeTab === 'mine';
  const search = toSearchQuery({ filters, limit: REPLAY_LIST.pageSize });
  const page = { limit: REPLAY_LIST.pageSize };

  const list = useOffsetInfiniteList({
    queryKey: isMine ? QUERY_KEYS.replays.mine(page) : QUERY_KEYS.replays.list(search),
    queryFn: ({ offset, signal }) => (isMine ? listMyReplays({ ...page, offset, signal }) : listReplays({ ...search, offset, signal }))
  });

  const isFiltered = !isMine && hasActiveFilters(filters);
  const empty = match({ isMine, isFiltered })
    .with({ isMine: true }, () => ({ title: 'emptyMineTitle', description: 'emptyMineDescription' }) as const)
    .with({ isFiltered: true }, () => ({ title: 'emptyTitle', description: 'emptyFilteredDescription' }) as const)
    .otherwise(() => ({ title: 'emptyTitle', description: 'emptyDescription' }) as const);

  return {
    tab: activeTab,
    isSignedIn,
    isMine,
    list,
    total: list.total,
    isTotalKnown: !list.isPending,
    isFiltered,
    empty,
    setTab,
    resetFilters: reset
  };
};
