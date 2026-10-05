import type { TankServerStatsRow } from '@otmetki/schemas';

import { wilsonInterval } from '@otmetki/ratings';
import { describe, expect, it } from 'vitest';

import { TANK_STATS_RANKING } from '../../../config/tank-stats.constants';
import { toServerStatsRow } from '../../../mappers/tank-stats.mappers';
import { serverStats, vehicle } from '../../../services/_tests/tanks.fixtures';
import { statsRankValue, statsSampleFloor } from '../stats-ranking';

const RATE_SORTS = ['winRate', 'winRateDiff', 'avgDamage', 'avgFrags', 'avgSpotted', 'survivalRate', 'accuracy'] as const;

const row = (fields: Parameters<typeof serverStats>[0]): TankServerStatsRow =>
  toServerStatsRow({ row: serverStats(fields), vehicle: vehicle({ tankId: fields.tankId, tier: 10 }), period: '7d', cohort: 'all', mode: 'random' });

describe('statsSampleFloor', () => {
  it('keeps the requested floor and no players floor for volume sorts', () => {
    for (const sort of TANK_STATS_RANKING.rawSorts) {
      expect(statsSampleFloor({ sort, minBattles: 0 })).toEqual({ battles: 0, players: 0 });
    }
  });

  it('raises the floor to the ranking minimum for every performance sort', () => {
    for (const sort of RATE_SORTS) {
      expect(statsSampleFloor({ sort, minBattles: 0 })).toEqual({
        battles: TANK_STATS_RANKING.minBattles,
        players: TANK_STATS_RANKING.minPlayers
      });
    }
  });

  it('keeps a requested floor above the ranking minimum', () => {
    const minBattles = TANK_STATS_RANKING.minBattles * 4;

    expect(statsSampleFloor({ sort: 'winRate', minBattles }).battles).toBe(minBattles);
  });
});

describe('statsRankValue', () => {
  const tiny = row({ tankId: 1, battles: TANK_STATS_RANKING.minBattles, winRate: 70, playerWinRate: 50, winRateDiff: 20 });
  const large = row({ tankId: 2, battles: 5_000, winRate: 60, playerWinRate: 50, winRateDiff: 10 });

  it('ranks a large sample above a small one with a higher raw win rate when sorting down', () => {
    expect(statsRankValue({ row: large, sort: 'winRate', order: 'desc' })).toBeGreaterThan(
      statsRankValue({ row: tiny, sort: 'winRate', order: 'desc' })
    );
  });

  it('uses the Wilson lower bound descending and the upper bound ascending', () => {
    const interval = wilsonInterval({ rate: tiny.winRate, trials: tiny.battles });

    expect(statsRankValue({ row: tiny, sort: 'winRate', order: 'desc' })).toBe(interval.lower);
    expect(statsRankValue({ row: tiny, sort: 'winRate', order: 'asc' })).toBe(interval.upper);
  });

  it('measures the win rate difference from the bounded win rate against the same baseline', () => {
    const bounded = statsRankValue({ row: tiny, sort: 'winRate', order: 'desc' });

    expect(statsRankValue({ row: tiny, sort: 'winRateDiff', order: 'desc' })).toBeCloseTo(bounded - tiny.playerWinRate);
  });

  it('bounds the survival rate by the battles too', () => {
    expect(statsRankValue({ row: tiny, sort: 'survivalRate', order: 'desc' })).toBeLessThan(tiny.survivalRate);
  });

  it('passes volume and average columns through unchanged', () => {
    expect(statsRankValue({ row: large, sort: 'battles', order: 'desc' })).toBe(large.battles);
    expect(statsRankValue({ row: large, sort: 'avgDamage', order: 'desc' })).toBe(large.avgDamage);
    expect(statsRankValue({ row: large, sort: 'tier', order: 'asc' })).toBe(large.vehicle.tier);
  });
});
