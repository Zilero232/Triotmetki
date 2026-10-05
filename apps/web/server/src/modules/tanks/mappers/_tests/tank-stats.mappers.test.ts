import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { TankServerStats } from '../../../../../generated';

import { toServerStatsRow } from '../tank-stats.mappers';

const COMPUTED = new Date('2026-09-26T00:00:00Z');

const stats = (fields: Partial<TankServerStats> = {}) =>
  mock<TankServerStats>({
    battles: 100,
    players: 10,
    winRate: 52,
    playerWinRate: 50,
    winRateDiff: 2,
    avgDamage: 2000,
    avgFrags: 1,
    avgSpotted: 1,
    avgXp: 900,
    avgBlocked: 500,
    survivalRate: 35,
    accuracy: 80,
    popularityRank: 3,
    computedAt: COMPUTED,
    ...fields
  });

const map = (row: TankServerStats) => toServerStatsRow({ row, vehicle: mock<VehicleSummary>(), period: '30d', cohort: 'all', mode: 'random' });

describe('toServerStatsRow', () => {
  it('clamps rates into their ranges and keeps a signed win rate difference', () => {
    const view = map(stats({ winRate: 130, survivalRate: -5, winRateDiff: -140 }));

    expect(view).toMatchObject({ winRate: 100, survivalRate: 0, winRateDiff: -100 });
  });

  it('never reports negative counts or averages', () => {
    expect(map(stats({ battles: -1, avgDamage: -10 }))).toMatchObject({ battles: 0, avgDamage: 0 });
  });

  it('shows a missing rate as zero rather than null', () => {
    expect(map(stats({ accuracy: Number.NaN })).accuracy).toBe(0);
  });

  it.each([null, 0, -1])('has no popularity rank for %s', (popularityRank) => {
    expect(map(stats({ popularityRank })).popularityRank).toBeNull();
  });

  it('keeps a real popularity rank', () => {
    expect(map(stats({ popularityRank: 1 })).popularityRank).toBe(1);
  });
});
