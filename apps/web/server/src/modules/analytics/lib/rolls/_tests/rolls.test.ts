import { HONEST_RNG } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { StoredShot } from '../../stored-shots/stored-shots.types';

import { shotRolls, summarizeRolls } from '../rolls';

const shot = (overrides: Partial<StoredShot>): StoredShot => ({
  damage: 400,
  nominal: 400,
  shell: 'armor_piercing',
  outcome: 'damage',
  distance: null,
  fatal: false,
  ...overrides
});

describe('shotRolls', () => {
  it('drops fatal, high-explosive, non-damaging and nominal-less shots', () => {
    const shots = [shot({ fatal: true }), shot({ shell: 'high_explosive' }), shot({ outcome: 'no_damage' }), shot({ nominal: null }), shot({})];

    expect(shotRolls(shots)).toHaveLength(1);
  });
});

describe('summarizeRolls', () => {
  it('returns empty metrics without shots', () => {
    const summary = summarizeRolls([]);

    expect(summary.meanRoll).toBeNull();
    expect(summary.withinSpread).toBeNull();
    expect(summary.buckets).toHaveLength(HONEST_RNG.buckets);
    expect(summary.distance).toEqual([]);
  });

  it('puts every roll into exactly one bucket', () => {
    const shots = [0.75, 0.9, 1, 1.1, 1.25, 1.3].map((ratio) => shot({ damage: Math.round(400 * ratio) }));
    const summary = summarizeRolls(shots);

    expect(summary.buckets.reduce((sum, bucket) => sum + bucket.shots, 0)).toBe(summary.shots);
  });

  it('computes the mean roll relative to the nominal damage', () => {
    const summary = summarizeRolls([shot({ damage: 440 }), shot({ damage: 400 })]);

    expect(summary.meanRoll).toBeCloseTo(0.05);
  });

  it('counts a roll outside the spread as not within it', () => {
    const summary = summarizeRolls([shot({ damage: 400 }), shot({ damage: 540 })]);

    expect(summary.withinSpread).toBeCloseTo(50);
  });

  it('computes the penetration rate per distance band', () => {
    const summary = summarizeRolls([shot({ distance: 50 }), shot({ distance: 60, outcome: 'no_damage' }), shot({ distance: 450 })]);
    const near = summary.distance[0];
    const far = summary.distance.at(-1);

    expect(near?.penRate).toBeCloseTo(50);
    expect(far?.to).toBeNull();
    expect(far?.shots).toBe(1);
  });
});
