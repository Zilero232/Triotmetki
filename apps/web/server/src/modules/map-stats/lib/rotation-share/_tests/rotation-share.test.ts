import { groupBy, sumBy } from 'remeda';
import { describe, expect, it } from 'vitest';

import type { RotationCount } from '../rotation-share.types';

import { MAP_STATS } from '../../../config/map-stats.constants';
import { withShares } from '../rotation-share';

const count = (arenaId: string, tier: number, mode: string, battles: number): RotationCount => ({
  arenaId,
  tier,
  mode,
  battles,
  modBattles: battles,
  replayBattles: 0
});

const ROWS = [
  count('karelia', 10, 'random', 30),
  count('himmelsdorf', 10, 'random', 10),
  count('karelia', 8, 'random', 5),
  count('karelia', MAP_STATS.allTiers, 'random', 35),
  count('himmelsdorf', MAP_STATS.allTiers, 'random', 10),
  count('karelia', 10, 'onslaught', 4)
];

describe('withShares', () => {
  const shares = withShares(ROWS);

  it('makes the shares of every tier and mode add up to the whole', () => {
    const scopes = groupBy(shares, (row) => `${row.tier}|${row.mode}`);

    for (const group of Object.values(scopes)) {
      expect(sumBy(group, (row) => row.share)).toBeCloseTo(100, 6);
    }
  });

  it('ranks a map played more above one played less within the same scope', () => {
    const karelia = shares.find((row) => row.arenaId === 'karelia' && row.tier === 10 && row.mode === 'random');
    const himmelsdorf = shares.find((row) => row.arenaId === 'himmelsdorf' && row.tier === 10 && row.mode === 'random');

    expect(karelia?.share).toBeGreaterThan(himmelsdorf?.share ?? 0);
  });

  it('keeps another mode from diluting the share', () => {
    expect(shares.find((row) => row.mode === 'onslaught')?.share).toBeCloseTo(100, 6);
  });

  it('gives a zero share when a scope has no battles', () => {
    expect(withShares([count('karelia', 5, 'random', 0)])[0]?.share).toBe(0);
  });

  it('returns nothing for no rows', () => {
    expect(withShares([])).toEqual([]);
  });
});
