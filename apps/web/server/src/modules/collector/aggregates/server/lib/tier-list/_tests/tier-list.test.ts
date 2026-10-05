import { describe, expect, it } from 'vitest';

import { tierListRanks } from '../tier-list';
import { TIER_LIST } from '../tier-list.constants';

const order = TIER_LIST.bands.map((band) => band.rank);

const rows = Array.from({ length: 20 }, (_, index) => ({
  tankId: index + 1,
  tier: index < 10 ? 8 : 10,
  score: index % 10,
  battles: TIER_LIST.minBattles
}));

describe('tierListRanks', () => {
  it('never ranks a lower score above a higher one within a tier', () => {
    const ranks = tierListRanks({ rows });
    const tierEight = rows.filter((row) => row.tier === 8).sort((left, right) => right.score - left.score);
    const positions = tierEight.map((row) => order.indexOf(ranks.get(row.tankId) ?? 'D'));

    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('ranks each tier independently', () => {
    const ranks = tierListRanks({ rows });

    expect(ranks.get(10)).toBe(ranks.get(20));
    expect(ranks.get(10)).toBe(order[0]);
  });

  it('skips tanks below the battle threshold', () => {
    const ranks = tierListRanks({ rows: [{ tankId: 1, tier: 8, score: 5, battles: TIER_LIST.minBattles - 1 }] });

    expect(ranks.size).toBe(0);
  });
});
