import type { TechTreeNode } from '@otmetki/schemas';

import { groupBy, sortBy } from 'remeda';

import type { TreeTier } from './tree-tiers.types';

export const groupByTier = (nodes: TechTreeNode[]): TreeTier[] => {
  const byTier = groupBy(nodes, ({ vehicle }) => vehicle.tier);
  const tiers = Object.values(byTier).map((group) => ({
    tier: group[0].vehicle.tier,
    nodes: sortBy(
      group,
      ({ vehicle }) => vehicle.type,
      ({ vehicle }) => vehicle.name
    )
  }));

  return sortBy(tiers, ({ tier }) => tier);
};
