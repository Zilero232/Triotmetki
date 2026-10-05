import { describe, expect, it } from 'vitest';

import type { BattleSample } from '../../battle-samples/battle-samples.types';

import { xpOfSamples } from '../tank-xp';

const battle = (overrides: Partial<BattleSample>): BattleSample => ({
  tankId: 1,
  battles: 1,
  wins: 0,
  damage: 0,
  spotted: 0,
  frags: 0,
  blocked: 0,
  survived: 0,
  isSingle: true,
  moeRaised: null,
  ...overrides
});

describe('xpOfSamples', () => {
  it('gives nothing for no battles', () => {
    expect(xpOfSamples({ samples: [], tier: 8 })).toBe(0);
  });

  it('rewards a win over a loss with the same numbers', () => {
    expect(xpOfSamples({ samples: [battle({ wins: 1 })], tier: 8 })).toBeGreaterThan(xpOfSamples({ samples: [battle({})], tier: 8 }));
  });

  it('scales damage by tier so the same damage is worth more on a lower tier', () => {
    const samples = [battle({ damage: 3000 })];

    expect(xpOfSamples({ samples, tier: 4 })).toBeGreaterThan(xpOfSamples({ samples, tier: 10 }));
  });

  it('adds up aggregated samples like single battles', () => {
    const single = battle({ wins: 1, damage: 2000, spotted: 1 });
    const pair = battle({ battles: 2, wins: 2, damage: 4000, spotted: 2, isSingle: false });

    expect(xpOfSamples({ samples: [pair], tier: 8 })).toBe(xpOfSamples({ samples: [single, single], tier: 8 }));
  });
});
