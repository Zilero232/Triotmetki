'use client';

import type { InsightsPeriod } from '@otmetki/schemas';

import type { PlayerTanksFilter } from '@/entities/player/profile';

import { useAuthSession } from '@/entities/auth/session';
import {
  getNicknameHistory,
  getPlayerActivity,
  getPlayerHistory,
  getPlayerInsights,
  getPlayerMarks,
  getPlayerPlaytime,
  getPlayerSessions,
  getPlayerTanks,
  PLAYERS_REQUEST
} from '@/entities/player/profile';
import { usePlus } from '@/features/plus/plus-gate';

import type { UsePlayerHistoryInput } from './use-profile-queries.types';

import { useProfileSection } from '../use-profile-section';

export const usePlayerTanks = (filter: PlayerTanksFilter = {}) =>
  useProfileSection({ section: 'tanks', params: filter, fetcher: (input) => getPlayerTanks({ ...input, filter }) });

export const usePlayerHistory = ({ metric, granularity }: UsePlayerHistoryInput) => {
  const { data: session } = useAuthSession();
  const { isPlus } = usePlus();

  const viewerId = session?.user.id ?? null;

  return useProfileSection({
    section: 'history',
    params: { metric, granularity, viewerId, isPlus },
    fetcher: (input) => getPlayerHistory({ ...input, metric, granularity })
  });
};

export const usePlayerActivity = () =>
  useProfileSection({
    section: 'activity',
    params: { days: PLAYERS_REQUEST.activityDays },
    fetcher: (input) => getPlayerActivity({ ...input, days: PLAYERS_REQUEST.activityDays })
  });

export const usePlayerSessions = (limit: number) =>
  useProfileSection({ section: 'sessions', params: { limit }, fetcher: (input) => getPlayerSessions({ ...input, limit, offset: 0 }) });

export const usePlayerMarks = () => useProfileSection({ section: 'marks', fetcher: getPlayerMarks });

export const usePlayerInsights = (period: InsightsPeriod) =>
  useProfileSection({ section: 'insights', params: { period }, fetcher: (input) => getPlayerInsights({ ...input, period }) });

export const usePlayerPlaytime = () => useProfileSection({ section: 'playtime', fetcher: getPlayerPlaytime });

export const useNicknameHistory = () => useProfileSection({ section: 'nicknames', fetcher: getNicknameHistory });
