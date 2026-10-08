'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthSession, useLinkedAccounts } from '@/entities/auth/session';
import { getFirstWin } from '@/entities/player/analytics';
import { challengeRows, challengeSummary, getWeeklyChallenges } from '@/entities/social/challenge';
import { getLeague } from '@/entities/social/league';
import { QUERY_KEYS } from '@/shared/constants';

import { HOME } from '../../../config';

export const useForYou = () => {
  const { data: session, isPending: isSessionPending } = useAuthSession();
  const { data: accounts } = useLinkedAccounts({ enabled: Boolean(session) });
  const lesta = accounts?.lesta ?? [];
  const primary = lesta.find(({ isPrimary }) => isPrimary) ?? lesta[0] ?? null;
  const { data: firstWin } = useQuery({
    queryKey: QUERY_KEYS.me.analytics.firstWin({ account: undefined }),
    queryFn: ({ signal }) => getFirstWin({ signal }),
    enabled: primary !== null,
    staleTime: HOME.staleMs
  });

  const { data: league } = useQuery({
    queryKey: QUERY_KEYS.social.league(HOME.league),
    queryFn: ({ signal }) => getLeague({ scope: HOME.league.scope, signal }),
    enabled: primary !== null,
    staleTime: HOME.staleMs
  });

  const { data: weekly } = useQuery({
    queryKey: QUERY_KEYS.social.challenges,
    queryFn: ({ signal }) => getWeeklyChallenges({ signal }),
    enabled: primary !== null,
    staleTime: HOME.staleMs
  });

  const me = league?.entries.find((entry) => entry.isMe && entry.value !== null) ?? null;
  const challenges = weekly && weekly.challenges.length > 0 ? challengeSummary(challengeRows(weekly.challenges)) : null;

  return {
    isPending: isSessionPending,
    isVisible: Boolean(session),
    nickname: primary?.nickname ?? null,
    firstWin: firstWin?.state === 'ready' ? { available: firstWin.available, taken: firstWin.taken } : null,
    leagueRank: me?.rank ?? null,
    challenges
  };
};
