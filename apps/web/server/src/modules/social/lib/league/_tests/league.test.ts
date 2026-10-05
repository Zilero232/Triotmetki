import { describe, expect, it } from 'vitest';

import { LEAGUE } from '../../../config/leagues.constants';
import { rankLeague } from '../league';

const row = (accountId: bigint, overrides: Partial<{ battles: number; damage: number; wn8Weighted: number; wn8Battles: number; marks: number }>) => ({
  accountId,
  battles: 10,
  damage: 20_000,
  wn8Weighted: 15_000,
  wn8Battles: 10,
  marks: 0,
  ...overrides
});

describe('rankLeague', () => {
  it('ranks by average damage per battle, not total', () => {
    const ranked = rankLeague({
      stats: [row(1n, { battles: 20, damage: 30_000 }), row(2n, { battles: 10, damage: 20_000 })],
      metric: 'damage',
      minBattles: 5
    });

    expect(ranked.map((entry) => entry.accountId)).toEqual([2n, 1n]);
  });

  it('puts players below the battle minimum last without a value', () => {
    const ranked = rankLeague({
      stats: [row(1n, { battles: LEAGUE.minBattles - 1, damage: 99_999 }), row(2n, {})],
      metric: 'damage',
      minBattles: LEAGUE.minBattles
    });

    expect(ranked[1]).toMatchObject({ accountId: 1n, value: null });
  });

  it('shares a rank between equal values', () => {
    const ranked = rankLeague({ stats: [row(1n, { marks: 2 }), row(2n, { marks: 2 }), row(3n, { marks: 1 })], metric: 'marks', minBattles: 5 });

    expect(ranked.map((entry) => entry.rank)).toEqual([1, 1, 3]);
  });
});
