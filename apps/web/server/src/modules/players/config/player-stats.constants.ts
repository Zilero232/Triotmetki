import type { RecentPeriod } from '@otmetki/schemas';

import { MASTERY_LEVELS } from '@otmetki/ratings';
import { PLUS_LIMITS } from '@otmetki/schemas';

export const PLAYER_STATS = {
  snapshotMode: 'random',
  deltaSums: ['battles', 'wins', 'damage', 'frags', 'spotted', 'cap', 'def', 'survived'],
  recentPeriods: ['24h', '7d', '30d', '60d', '1000'] satisfies RecentPeriod[],
  serverReference: { mode: 'random', period: 'd30', cohort: 'all', cacheTtlMs: 15 * 60_000, cacheKey: 'server-reference' },
  insightsMinBattles: { overall: 30, recent: 5 }
} as const;

const HISTORY = {
  defaultDays: PLUS_LIMITS.historyDays.free,
  maxDays: 730
} as const;

export const HISTORY_WINDOW = {
  free: { limitDays: PLUS_LIMITS.historyDays.free, defaultDays: HISTORY.defaultDays },
  full: { limitDays: HISTORY.maxDays, defaultDays: HISTORY.maxDays },
  publicApi: { limitDays: HISTORY.maxDays, defaultDays: HISTORY.defaultDays }
} as const;

export const PLAYER_MARKS = {
  minTier: 5,
  combinedDamageBattles: 100,
  maxMastery: MASTERY_LEVELS.length - 1
} as const;
