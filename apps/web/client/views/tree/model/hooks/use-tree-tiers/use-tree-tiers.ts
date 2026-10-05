'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { TREE_FORMAT } from '../../../config';
import { groupByTier } from '../../../lib/tree-tiers';
import { useTree } from '../../context';
import { usePathSelection } from '../use-path-selection';

export const useTreeTiers = () => {
  const t = useTranslations('tree.node');
  const format = useFormatter();
  const { tree } = useTree();
  const { path, selected, selectTank } = usePathSelection();

  const onPath = new Set(path);
  const selectedId = selected?.vehicle.tankId ?? null;
  const grouped = groupByTier(tree.nodes);
  const openTier = selected?.vehicle.tier ?? grouped[0]?.tier ?? null;

  const tiers = grouped.map(({ tier, nodes }) => ({
    tier,
    isOpen: tier === openTier,
    items: nodes.map(({ vehicle, xp }) => ({
      vehicle,
      state: vehicle.tankId === selectedId ? 'selected' : onPath.has(vehicle.tankId) ? 'path' : undefined,
      cost: xp !== null && xp > 0 ? t('xp', { value: format.number(xp, TREE_FORMAT.compact) }) : t('root')
    }))
  }));

  return { tiers, selectTank };
};
