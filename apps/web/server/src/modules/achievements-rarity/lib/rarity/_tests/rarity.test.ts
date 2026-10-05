import { describe, expect, it } from 'vitest';

import { RARITY_POINTS, RARITY_TIER_NAMES } from '../../../config/rarity.constants';
import { rarityPoints, rarityTier, shareOf } from '../rarity';

describe('rarityPoints', () => {
  it('gives rarer medals more points', () => {
    const shares = [1, 0.5, 0.2, 0.05, 0.01, 0.001];
    const points = shares.map(rarityPoints);

    for (let index = 1; index < points.length; index += 1) {
      expect(points[index]).toBeGreaterThan(points[index - 1] ?? 0);
    }
  });

  it('stays inside the configured range', () => {
    expect(rarityPoints(1)).toBe(RARITY_POINTS.min);
    expect(rarityPoints(0)).toBe(RARITY_POINTS.max);
    expect(rarityPoints(1e-9)).toBe(RARITY_POINTS.max);
    expect(rarityPoints(2)).toBe(RARITY_POINTS.min);
  });

  it('grows slower than the inverse share', () => {
    expect(rarityPoints(0.01) / rarityPoints(1)).toBeLessThan(1 / 0.01);
  });
});

describe('rarityTier', () => {
  it('orders tiers from the rarest to the most common', () => {
    const tiers = [0.001, 0.03, 0.1, 0.3, 0.9].map(rarityTier);

    expect(tiers).toEqual([...RARITY_TIER_NAMES]);
  });

  it('never gets rarer as the share grows', () => {
    const rank = (share: number) => RARITY_TIER_NAMES.indexOf(rarityTier(share));

    expect(rank(0.02)).toBeGreaterThanOrEqual(rank(0.005));
    expect(rank(0.6)).toBeGreaterThanOrEqual(rank(0.4));
  });
});

describe('shareOf', () => {
  it('is zero for an empty sample', () => {
    expect(shareOf({ part: 3, whole: 0 })).toBe(0);
  });

  it('divides the part by the whole', () => {
    expect(shareOf({ part: 1, whole: 4 })).toBeCloseTo(0.25);
  });
});
