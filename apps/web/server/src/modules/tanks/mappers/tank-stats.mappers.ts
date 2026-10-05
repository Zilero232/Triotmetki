import type { TankServerStatsRow } from '@otmetki/schemas';

import type { ServerStatsRowInput } from './tank-stats.types';

import { clampPercent, clampPercentDelta } from '../../../common/lib';

const positive = (value: number): number => Math.max(0, value);

export const toServerStatsRow = ({ row, vehicle, period, cohort, mode }: ServerStatsRowInput): TankServerStatsRow => ({
  vehicle,
  period,
  cohort,
  mode,
  battles: positive(row.battles),
  players: positive(row.players),
  winRate: clampPercent(row.winRate) ?? 0,
  playerWinRate: clampPercent(row.playerWinRate) ?? 0,
  winRateDiff: clampPercentDelta(row.winRateDiff) ?? 0,
  avgDamage: positive(row.avgDamage),
  avgFrags: positive(row.avgFrags),
  avgSpotted: positive(row.avgSpotted),
  avgXp: positive(row.avgXp),
  avgBlocked: positive(row.avgBlocked),
  survivalRate: clampPercent(row.survivalRate) ?? 0,
  accuracy: clampPercent(row.accuracy) ?? 0,
  popularityRank: row.popularityRank !== null && row.popularityRank > 0 ? row.popularityRank : null,
  computedAt: row.computedAt.toISOString()
});
