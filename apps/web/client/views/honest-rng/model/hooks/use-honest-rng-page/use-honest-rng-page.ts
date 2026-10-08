'use client';

import { useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';

import { PERIOD_LABEL, QUERY_KEYS } from '@/shared/constants';
import { percentText } from '@/shared/lib';

import { getHonestRng } from '../../../api';
import { HONEST_RNG_VIEW, RNG_PERIODS } from '../../../config';
import { bucketMidpoints, bucketShares, isRngShell, rollPercent } from '../../../lib/rng-chart';
import { useRngPeriod } from '../use-rng-period';

export const useHonestRngPage = () => {
  const t = useTranslations('honestRng');
  const tPeriods = useTranslations('periods');
  const format = useFormatter();
  const [period, setPeriod] = useRngPeriod();
  const query = useQuery({
    queryKey: QUERY_KEYS.honestRng.server({ period }),
    queryFn: ({ signal }) => getHonestRng({ period, signal }),
    staleTime: HONEST_RNG_VIEW.staleMs
  });

  const { data } = query;
  const server = data?.server ?? null;
  const buckets = server?.buckets ?? data?.theory ?? [];

  return {
    period,
    periods: RNG_PERIODS.map((value) => ({ value, label: tPeriods(PERIOD_LABEL[value]) })),
    setPeriod: (value: (typeof RNG_PERIODS)[number]) => void setPeriod(value),
    query,
    server,
    hasFigures: query.isPending || query.isError || server !== null,
    meanRoll: rollPercent(server?.meanRoll),
    chart: {
      labels: bucketMidpoints(buckets).map((value) => format.number(value / HONEST_RNG_VIEW.percentScale, 'signedPercent')),
      series: [
        { id: 'fact', label: t('server.fact'), values: bucketShares(server?.buckets ?? []), tone: 'accent' as const },
        { id: 'theory', label: t('server.theory'), values: bucketShares(data?.theory ?? []), tone: 'steel' as const }
      ]
    },
    tiers: (data?.tiers ?? []).map((row) => ({
      id: `tier-${row.tier}`,
      tier: row.tier,
      shots: row.shots,
      meanRoll: rollPercent(row.meanRoll),
      within: row.withinSpread
    })),
    shells: (data?.shells ?? []).flatMap(({ shell, shots, meanRoll, withinSpread }) => {
      if (!isRngShell(shell)) {
        return [];
      }

      return [{ id: `shell-${shell}`, shell, shots, meanRoll: rollPercent(meanRoll), within: withinSpread }];
    }),
    formatPercent: (value: number) => percentText({ format, value, digits: 1 })
  };
};
