'use client';

import { useQuery } from '@tanstack/react-query';
import { findLast } from 'remeda';

import { pulseQueries } from '@/entities/pulse/pulse';
import { gameStatusQueries } from '@/entities/reference/game-status';
import { PREFETCHED_STALE_TIME } from '@/shared/api/query-client';
import { useClientNow } from '@/shared/lib';

import { isActivityStale, serverFiguresState } from '../../../lib/server-figures';

export const useServerStatus = () => {
  const { data: version } = useQuery({ ...gameStatusQueries.version(), staleTime: PREFETCHED_STALE_TIME });
  const { data: servers } = useQuery({ ...gameStatusQueries.servers(), staleTime: PREFETCHED_STALE_TIME });
  const { data: pulse, isPending, isError, isRefetching, refetch } = useQuery(pulseQueries.current());
  const now = useClientNow();

  const activity = pulse?.series.map((point) => point.players) ?? [];
  const trackedPlayers = pulse?.trackedPlayers ?? null;
  const online = servers?.online ?? null;
  const state = serverFiguresState({ isPending, isError, trackedPlayers, online });
  const versionName = version?.version ?? null;
  const activePlayers = pulse?.activePlayers ?? null;
  const lastActiveAt = findLast(pulse?.series ?? [], ({ players }) => players > 0)?.at ?? null;

  return {
    state,
    version: versionName,
    isVersionShown: state !== 'error' && (state !== 'empty' || versionName !== null),
    releasedAt: version?.releasedAt ?? null,
    online,
    activePlayers,
    lastActiveAt,
    isActivityStale: state === 'ready' && isActivityStale({ activePlayers, lastActiveAt, now }),
    trackedPlayers,
    updatedAt: pulse?.computedAt ?? null,
    trend: activity.length > 1 ? activity : undefined,
    isRetrying: isRefetching,
    retry: () => void refetch()
  };
};
