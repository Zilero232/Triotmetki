import { wilsonInterval } from '@otmetki/ratings';
import { isIncludedIn } from 'remeda';
import { match } from 'ts-pattern';

import type { StatsRankValueInput, StatsSampleFloor, StatsSampleFloorInput } from './stats-ranking.types';

import { TANK_STATS_RANKING } from '../../config/tank-stats.constants';

export const statsSampleFloor = ({ sort, minBattles }: StatsSampleFloorInput): StatsSampleFloor =>
  isIncludedIn(sort, TANK_STATS_RANKING.rawSorts)
    ? { battles: minBattles, players: 0 }
    : { battles: Math.max(minBattles, TANK_STATS_RANKING.minBattles), players: TANK_STATS_RANKING.minPlayers };

export const statsRankValue = ({ row, sort, order }: StatsRankValueInput): number => {
  const bound = (rate: number): number => {
    const interval = wilsonInterval({ rate, trials: row.battles });

    return order === 'asc' ? interval.upper : interval.lower;
  };

  return match(sort)
    .with('battles', () => row.battles)
    .with('players', () => row.players)
    .with('winRate', () => bound(row.winRate))
    .with('winRateDiff', () => bound(row.winRate) - row.playerWinRate)
    .with('avgDamage', () => row.avgDamage)
    .with('avgFrags', () => row.avgFrags)
    .with('avgSpotted', () => row.avgSpotted)
    .with('survivalRate', () => bound(row.survivalRate))
    .with('accuracy', () => row.accuracy)
    .with('tier', () => row.vehicle.tier)
    .exhaustive();
};
