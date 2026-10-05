import { winRateDiffFromAggregate } from '@otmetki/ratings';
import { groupBy, sortBy } from 'remeda';

import type { BuildServerStatsInput, DailyStatsRow, PeriodPlayersAtInput, PlayerCountRow, ServerStatsRow } from './server-stats.types';

import { CohortFilter } from '../../../../../../../generated';
import { ratio } from '../../../../../../common/lib';
import { tierListRanks } from '../tier-list';
import { SERVER_STATS } from './server-stats.constants';

const cohortFilters: ReadonlySet<string> = new Set(Object.values(CohortFilter));

const isCohortFilter = (value: string): value is CohortFilter => cohortFilters.has(value);

const playerKey = ({ tankId, cohort }: Pick<DailyStatsRow, 'cohort' | 'tankId'>) => `${tankId}:${cohort}`;

const sumRows = (rows: readonly DailyStatsRow[]): DailyStatsRow =>
  rows.reduce(
    (total, row) => ({
      ...total,
      samples: total.samples + row.samples,
      battles: total.battles + row.battles,
      wins: total.wins + row.wins,
      damage: total.damage + row.damage,
      frags: total.frags + row.frags,
      spotted: total.spotted + row.spotted,
      xp: total.xp + row.xp,
      blocked: total.blocked + row.blocked,
      survived: total.survived + row.survived,
      hits: total.hits + row.hits,
      shots: total.shots + row.shots,
      playerWins: total.playerWins + row.playerWins
    }),
    {
      tankId: rows[0]?.tankId ?? 0,
      cohort: SERVER_STATS.allCohorts,
      samples: 0,
      battles: 0,
      wins: 0,
      damage: 0,
      frags: 0,
      spotted: 0,
      xp: 0,
      blocked: 0,
      survived: 0,
      hits: 0,
      shots: 0,
      playerWins: 0
    }
  );

export const buildServerStats = ({ rows, players, tiers, mode, period }: BuildServerStatsInput): ServerStatsRow[] => {
  const perTankAll = Object.values(groupBy(rows, (row) => row.tankId)).map((group) => sumRows(group));
  const byCohort = [...perTankAll, ...rows.filter((row) => row.cohort !== SERVER_STATS.allCohorts)];
  const playerCounts = new Map(players.map((row) => [playerKey(row), row.players]));
  const result: ServerStatsRow[] = [];

  for (const [cohort, group] of Object.entries(groupBy(byCohort, (row) => row.cohort))) {
    if (!isCohortFilter(cohort)) {
      continue;
    }

    const stats = group.flatMap((row) => {
      const diff = winRateDiffFromAggregate({ battles: row.battles, wins: row.wins, playerWinRateBattles: row.playerWins });

      if (!diff) {
        return [];
      }

      const perBattle = (value: number) => ratio({ value, by: row.battles }) ?? 0;

      return [
        {
          tankId: row.tankId,
          mode,
          period,
          cohort,
          battles: row.battles,
          players: playerCounts.get(playerKey(row)) ?? 0,
          samples: row.samples,
          winRate: diff.tankWinRate,
          playerWinRate: diff.expectedWinRate,
          winRateDiff: diff.diff,
          avgDamage: perBattle(row.damage),
          avgFrags: perBattle(row.frags),
          avgSpotted: perBattle(row.spotted),
          avgXp: perBattle(row.xp),
          avgBlocked: perBattle(row.blocked),
          survivalRate: perBattle(row.survived) * 100,
          accuracy: ratio({ value: row.hits * 100, by: row.shots }) ?? 0,
          popularityRank: null,
          tierListRank: null
        }
      ];
    });

    const ranks = tierListRanks({
      rows: stats.flatMap((row) => {
        const tier = tiers.get(row.tankId);

        return tier === undefined ? [] : [{ tankId: row.tankId, tier, score: row.winRateDiff, battles: row.battles }];
      })
    });

    sortBy(stats, [(row) => row.battles, 'desc']).forEach((row, index) => {
      result.push({ ...row, popularityRank: index + 1, tierListRank: ranks.get(row.tankId) ?? null });
    });
  }

  return result;
};

export const periodPlayersAt = ({ rows, index }: PeriodPlayersAtInput): PlayerCountRow[] =>
  rows.flatMap(({ tankId, cohort, players }) => {
    const count = players[index] ?? 0;

    return count > 0 ? [{ tankId, cohort, players: count }] : [];
  });
