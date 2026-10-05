import { sortBy } from 'remeda';
import { match } from 'ts-pattern';

import type { LeagueMetric, LeagueValueInput, RankedEntry, RankLeagueInput } from './league.types';

import { ratio } from '../../../../common/lib';

const valueOf = ({ stats, metric }: LeagueValueInput): number | null =>
  match(metric)
    .with('damage', () => ratio({ value: stats.damage, by: stats.battles }))
    .with('wn8', () => ratio({ value: stats.wn8Weighted, by: stats.wn8Battles }))
    .with('marks', () => stats.marks)
    .with('battles', () => stats.battles)
    .exhaustive();

export const rankLeague = ({ stats, metric, minBattles }: RankLeagueInput): RankedEntry[] => {
  const needsBattles = metric === 'damage' || metric === 'wn8';
  const rows = stats.map((row) => ({
    accountId: row.accountId,
    battles: row.battles,
    value: needsBattles && row.battles < minBattles ? null : valueOf({ stats: row, metric })
  }));

  const sorted = sortBy(rows, [(row) => row.value ?? Number.NEGATIVE_INFINITY, 'desc'], [(row) => row.battles, 'desc']);
  let rank = 0;
  let previous: number | null | undefined;

  return sorted.map((row, index) => {
    if (row.value !== previous) {
      rank = index + 1;
      previous = row.value;
    }

    return { ...row, rank };
  });
};

export const needsMarks = (metric: LeagueMetric): boolean => metric === 'marks';
