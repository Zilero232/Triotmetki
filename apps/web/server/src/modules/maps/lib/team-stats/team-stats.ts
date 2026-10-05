import type { MapStats } from '@otmetki/schemas';

import { sumBy } from 'remeda';

import type { BattleSideRow, ToStatsInput, WinnerRow } from './team-stats.types';

import { winRatePercent } from '../../../../common/lib';
import { MAP_TEAMS } from '../../config/maps.constants';

const otherTeam = (team: number): number => MAP_TEAMS.teams.find((candidate) => candidate !== team) ?? team;

const toStats = ({ source, winners }: ToStatsInput): MapStats | null => {
  const counted = winners.map((row) => ({ winner: row.winner, battles: Math.max(0, Math.round(row.battles)) }));
  const battles = sumBy(counted, (row) => row.battles);

  if (battles === 0) {
    return null;
  }

  return {
    source,
    battles,
    teams: MAP_TEAMS.teams.map((team) => ({
      team,
      battles,
      winRate: winRatePercent({ wins: sumBy(counted, (row) => (row.winner === team ? row.battles : 0)), battles })
    }))
  };
};

export const statsFromBattles = (rows: readonly BattleSideRow[]): MapStats | null =>
  toStats({
    source: 'battles',
    winners: rows.flatMap((row): WinnerRow[] => {
      if (row.team === null || !MAP_TEAMS.teams.includes(row.team)) {
        return [];
      }

      if (row.result === 'draw') {
        return [{ winner: null, battles: row.battles }];
      }

      return [{ winner: row.result === 'win' ? row.team : otherTeam(row.team), battles: row.battles }];
    })
  });

export const statsFromReplays = (rows: readonly WinnerRow[]): MapStats | null => toStats({ source: 'replays', winners: rows });
