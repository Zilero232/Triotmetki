import { groupBy, sortBy } from 'remeda';

import type { TierListRank, TierListRanksInput } from './tier-list.types';

import { TIER_LIST } from './tier-list.constants';

const bandFor = (share: number): TierListRank => TIER_LIST.bands.find((band) => share <= band.upTo)?.rank ?? 'D';

export const tierListRanks = ({ rows, minBattles = TIER_LIST.minBattles }: TierListRanksInput): Map<number, TierListRank> => {
  const ranks = new Map<number, TierListRank>();
  const eligible = rows.filter((row) => row.battles >= minBattles && Number.isFinite(row.score));

  for (const group of Object.values(groupBy(eligible, (row) => row.tier))) {
    const ordered = sortBy(group, [(row) => row.score, 'desc']);

    ordered.forEach((row, index) => {
      ranks.set(row.tankId, bandFor((index + 1) / ordered.length));
    });
  }

  return ranks;
};
