import { clamp } from 'remeda';

import type { RarityTier, ShareInput } from './rarity.types';

import { RARITY_POINTS, RARITY_TIERS } from '../../config/rarity.constants';

export const rarityPoints = (share: number): number => {
  if (share <= 0) {
    return RARITY_POINTS.max;
  }

  const raw = RARITY_POINTS.min * (1 / Math.min(share, 1)) ** RARITY_POINTS.exponent;

  return clamp(Math.round(raw), { min: RARITY_POINTS.min, max: RARITY_POINTS.max });
};

export const rarityTier = (share: number): RarityTier => RARITY_TIERS.find(({ below }) => share < below)?.tier ?? 'common';

export const shareOf = ({ part, whole }: ShareInput): number => (whole > 0 ? part / whole : 0);
