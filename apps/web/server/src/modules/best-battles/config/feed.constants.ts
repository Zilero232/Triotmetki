import { GAME_MODE_BONUS_TYPES } from '../../reference';

export const BEST_BATTLES = {
  defaultPeriod: 'week',
  defaultMetric: 'damage',
  defaultLimit: 25,
  maxLimit: 50,
  maxRank: 500,
  periodDays: { day: 1, week: 7, month: 30 },
  battleTypes: GAME_MODE_BONUS_TYPES.random.map(String),
  feedCacheMs: 120_000,
  facetsCacheMs: 300_000,
  facetMedals: 12,
  facetTanks: 12,
  facetArenas: 12
} as const;
