import type { RARITY_TIER_NAMES } from '../../config/rarity.constants';

export type RarityTier = (typeof RARITY_TIER_NAMES)[number];

export type ShareInput = {
  part: number;
  whole: number;
};
