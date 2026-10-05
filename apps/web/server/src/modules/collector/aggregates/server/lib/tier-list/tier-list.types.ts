import type { TIER_LIST } from './tier-list.constants';

export type TierListRank = (typeof TIER_LIST.bands)[number]['rank'];

type TierListRow = {
  tankId: number;
  tier: number;
  score: number;
  battles: number;
};

export type TierListRanksInput = {
  rows: readonly TierListRow[];
  minBattles?: number;
};
