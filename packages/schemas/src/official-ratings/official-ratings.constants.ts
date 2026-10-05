export const OFFICIAL_RATING_PERIODS = ['1d', '7d', '28d', 'overall'] as const;

export const OFFICIAL_RATING_FIELDS = [
  'globalRating',
  'battles',
  'winRate',
  'avgDamage',
  'avgXp',
  'avgFrags',
  'avgSpotted',
  'survivalRate',
  'accuracy',
  'maxXp'
] as const;

export const OFFICIAL_RATINGS = {
  profilePeriods: ['7d', '28d'],
  defaultPeriod: 'overall',
  defaultField: 'globalRating',
  top: { defaultLimit: 50, maxLimit: 100, maxPage: 100 },
  neighbors: { defaultLimit: 5, maxLimit: 20 },
  history: { defaultDays: 14, maxDays: 30 }
} as const;
