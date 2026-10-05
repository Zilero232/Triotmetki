export const PLAYER_RATINGS_AGGREGATE = {
  referenceCacheTtlMs: 15 * 60_000,
  ratingModes: ['random', 'all']
} as const;

export const ACCOUNT_RATING_CHANGE_COLUMNS = [
  'battles',
  'win_rate',
  'avg_damage',
  'avg_frags',
  'avg_tier',
  'wn8',
  'eff',
  'brone_index',
  'from_captured_at',
  'to_captured_at'
] as const;

export const ACCOUNT_TANK_RATING_CHANGE_COLUMNS = ['battles', 'win_rate', 'avg_damage', 'avg_frags', 'avg_xp', 'wn8', 'damage_percentile'] as const;
