import type { OfficialRatingField, OfficialRatingPeriod } from '@otmetki/schemas';

import type { RatingRankField } from '../../../../lib/lesta';

export const OFFICIAL_FIELD_TO_LESTA = {
  globalRating: 'global_rating',
  battles: 'battles_count',
  winRate: 'wins_ratio',
  avgDamage: 'damage_avg',
  avgXp: 'xp_avg',
  avgFrags: 'frags_avg',
  avgSpotted: 'spotted_avg',
  survivalRate: 'survived_ratio',
  accuracy: 'hits_ratio',
  maxXp: 'xp_max'
} as const satisfies Record<OfficialRatingField, RatingRankField>;

export const OFFICIAL_PERIOD_TO_LESTA = {
  '1d': '1',
  '7d': '7',
  '28d': '28',
  overall: 'all'
} as const satisfies Record<OfficialRatingPeriod, string>;
