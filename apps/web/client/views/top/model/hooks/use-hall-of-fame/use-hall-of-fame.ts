'use client';

import type { OfficialRatingField, OfficialRatingPeriod } from '@otmetki/schemas';

import { OFFICIAL_RATING_PERIODS, OFFICIAL_RATINGS } from '@otmetki/schemas';
import { useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { isIncludedIn } from 'remeda';

import { useAuthSession } from '@/entities/auth/session';
import {
  leaderboardsControllerOfficialHistoryOptions,
  leaderboardsControllerOfficialNeighborsOptions,
  leaderboardsControllerOfficialTopOptions
} from '@/shared/api/query-options';
import { isNotFoundError } from '@/shared/api/source';
import { percentText } from '@/shared/lib';

import { HALL_OF_FAME } from '../../../config';
import { officialEntryLink } from '../../../lib/official-entry';

export const useHallOfFame = () => {
  const t = useTranslations('top.hall');
  const format = useFormatter();
  const { data: session } = useAuthSession();
  const [period, setPeriod] = useState<OfficialRatingPeriod>(OFFICIAL_RATINGS.defaultPeriod);
  const [field, setField] = useState<OfficialRatingField>(OFFICIAL_RATINGS.defaultField);

  const accountId = session?.lestaAccountId ?? null;
  const path = { id: accountId ?? 0 };

  const top = useQuery(leaderboardsControllerOfficialTopOptions({ query: { period, field, limit: HALL_OF_FAME.topLimit } }));

  const neighbors = useQuery({
    ...leaderboardsControllerOfficialNeighborsOptions({ path, query: { period, field, limit: HALL_OF_FAME.neighborsLimit } }),
    enabled: accountId !== null
  });

  const history = useQuery({
    ...leaderboardsControllerOfficialHistoryOptions({ path, query: { period, field, days: HALL_OF_FAME.historyDays } }),
    enabled: accountId !== null
  });

  const withLinks = <T extends { accountId: number; nickname: string | null }>(items: readonly T[]) =>
    items.map((item) => ({ ...item, link: officialEntryLink(item), isViewer: item.accountId === accountId }));

  const isTopMissing = isNotFoundError(top.error);
  const ranks = (history.data?.points ?? []).flatMap((point) => (point.rank === null ? [] : [point.rank]));
  const isPercent = isIncludedIn(field, HALL_OF_FAME.percentFields);

  const valueText = (value: number | null): string =>
    value === null ? HALL_OF_FAME.missing : isPercent ? percentText({ format, value }) : format.number(value, { maximumFractionDigits: 2 });

  return {
    period,
    field,
    periodOptions: OFFICIAL_RATING_PERIODS.map((value) => ({ value, label: t(`periods.${value}`) })),
    fieldItems: HALL_OF_FAME.fields.map((value) => ({ value, label: t(`fields.${value}`) })),
    valueText,
    top: {
      data: isTopMissing ? { items: [] } : top.data,
      isError: top.isError && !isTopMissing,
      isRefetching: top.isRefetching,
      refetch: top.refetch
    },
    topItems: withLinks(top.data?.items ?? []),
    neighbors: withLinks(neighbors.data?.items ?? []),
    rankTrend: ranks.map((rank) => -rank),
    latestRank: ranks.at(-1) ?? null,
    isSignedIn: accountId !== null,
    onPeriodChange: setPeriod,
    onFieldChange: setField
  };
};
