import type { PlayerInsights } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { tipValues } from '../insight-tip';

const VEHICLE = {
  tankId: 42,
  name: 'Object 140',
  shortName: 'Об. 140',
  slug: 'object-140',
  nation: 'ussr',
  type: 'mediumTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
} as const;

const INSIGHTS: PlayerInsights = {
  period: 'overall',
  battles: 1_000,
  byClass: [],
  byTier: [],
  weakTanks: [
    {
      vehicle: VEHICLE,
      battles: 100,
      winRate: 45,
      serverWinRate: 50,
      winRateDelta: -5,
      avgDamage: 2_000,
      serverAvgDamage: 2_500,
      damageRatio: 0.8
    }
  ],
  strongTanks: [],
  tips: []
};

describe('tipValues', () => {
  it('names the tank a tip points at', () => {
    const values = tipValues({ tip: { code: 'low_damage_tank', params: { tankId: 42, damageRatio: 0.8 } }, insights: INSIGHTS });

    expect(values.tank).toBe(VEHICLE.shortName);
  });

  it('shows the damage ratio as a whole percent', () => {
    const values = tipValues({ tip: { code: 'low_damage_tank', params: { tankId: 42, damageRatio: 0.8 } }, insights: INSIGHTS });

    expect(values.damageRatio).toBe(80);
  });

  it('passes a negative win-rate gap as a positive number for the message to format in the page locale', () => {
    const values = tipValues({ tip: { code: 'weak_class', params: { type: 'heavyTank', winRateDelta: -3.4 } }, insights: INSIGHTS });

    expect(values.winRateDelta).toBe(3.4);
  });

  it('writes the tier as a roman numeral', () => {
    const values = tipValues({ tip: { code: 'weak_tier', params: { tier: 8, winRateDelta: -2 } }, insights: INSIGHTS });

    expect(values.tierRoman).toBe('VIII');
  });
});
