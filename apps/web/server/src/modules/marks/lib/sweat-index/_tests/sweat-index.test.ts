import { SWEAT_LEVELS } from '@otmetki/schemas';
import { range } from 'remeda';
import { describe, expect, it } from 'vitest';

import { SWEAT_INDEX } from '../../../config/sweat-index.constants';
import { buildSweatIndex, sweatCutoffs, sweatLevel, sweatRatio } from '../sweat-index';

const TANK_IDS = range(1, SWEAT_INDEX.minTanks * 2 + 1);

describe('sweatRatio', () => {
  it('divides the threshold by the baseline', () => {
    expect(sweatRatio({ threshold: 4_000, baseline: 2_000 })).toBe(2);
  });

  it('is unknown without a positive threshold and baseline', () => {
    expect(sweatRatio({ threshold: 4_000, baseline: 0 })).toBeNull();
    expect(sweatRatio({ threshold: undefined, baseline: 2_000 })).toBeNull();
  });
});

describe('sweatCutoffs', () => {
  it('needs enough tanks to rank against', () => {
    expect(sweatCutoffs(range(0, SWEAT_INDEX.minTanks - 1))).toBeNull();
  });

  it('orders the cutoffs from moderate to extreme', () => {
    const cutoffs = sweatCutoffs(TANK_IDS);
    const values = [cutoffs?.moderate, cutoffs?.hard, cutoffs?.extreme].map((value) => value ?? Number.NaN);

    expect(cutoffs).not.toBeNull();
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});

describe('sweatLevel', () => {
  it('never gets easier as the ratio grows', () => {
    const cutoffs = sweatCutoffs(TANK_IDS);
    const ranks = TANK_IDS.map((value) => SWEAT_LEVELS.indexOf(sweatLevel({ value, cutoffs }) ?? 'easy'));

    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(ranks).size).toBe(SWEAT_LEVELS.length);
  });

  it('has no level without cutoffs or a ratio', () => {
    expect(sweatLevel({ value: 2, cutoffs: null })).toBeNull();
    expect(sweatLevel({ value: null, cutoffs: sweatCutoffs(TANK_IDS) })).toBeNull();
  });
});

describe('buildSweatIndex', () => {
  it('ranks a harder threshold at a higher level than an easier one on the same baseline', () => {
    const baselines = new Map(TANK_IDS.map((tankId) => [tankId, { damage: 1_000, xp: 500 }]));
    const moe = new Map(TANK_IDS.map((tankId) => [tankId, 1_000 + tankId * 100]));
    const index = buildSweatIndex({ tankIds: TANK_IDS, moe, mastery: new Map(), baselines });
    const easiest = index.get(TANK_IDS[0] ?? 0);
    const hardest = index.get(TANK_IDS.at(-1) ?? 0);

    expect(SWEAT_LEVELS.indexOf(hardest?.moeLevel ?? 'easy')).toBeGreaterThan(SWEAT_LEVELS.indexOf(easiest?.moeLevel ?? 'easy'));
    expect(hardest?.mastery).toBeNull();
  });

  it('leaves a tank without a baseline unranked', () => {
    const index = buildSweatIndex({ tankIds: [1], moe: new Map([[1, 3_000]]), mastery: new Map(), baselines: new Map() });

    expect(index.get(1)).toEqual({ moe: null, moeLevel: null, mastery: null, masteryLevel: null });
  });
});
