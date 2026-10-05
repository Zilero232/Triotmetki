import type { TechTreeNode } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { groupByTier } from '../tree-tiers';

const node = ({ tankId, tier, type, name }: Pick<TechTreeNode['vehicle'], 'name' | 'tankId' | 'tier' | 'type'>): TechTreeNode => ({
  vehicle: {
    tankId,
    tier,
    name,
    shortName: name,
    slug: `t-${tankId}`,
    nation: 'ussr',
    type,
    isPremium: false,
    isCollectible: false,
    status: 'researchable',
    images: { small: null, contour: null, big: null }
  },
  xp: null,
  credits: null,
  gold: null,
  parents: [],
  children: []
});

const NODES = [
  node({ tankId: 3, tier: 2, type: 'mediumTank', name: 'T-46' }),
  node({ tankId: 1, tier: 1, type: 'lightTank', name: 'MS-1' }),
  node({ tankId: 2, tier: 2, type: 'heavyTank', name: 'T-150' }),
  node({ tankId: 4, tier: 2, type: 'heavyTank', name: 'KV-1' })
];

describe('groupByTier', () => {
  it('orders the tiers from the starting tank up', () => {
    expect(groupByTier(NODES).map(({ tier }) => tier)).toEqual([1, 2]);
  });

  it('keeps the vehicles of one class together, by name', () => {
    expect(groupByTier(NODES)[1].nodes.map(({ vehicle }) => vehicle.tankId)).toEqual([4, 2, 3]);
  });

  it('has no tiers for an empty tree', () => {
    expect(groupByTier([])).toEqual([]);
  });
});
