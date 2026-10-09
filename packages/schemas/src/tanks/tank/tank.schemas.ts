import * as z from 'zod';

import { vehicleStatsSchema } from '../../builds/builds.schemas';
import { ratingPeriodSchema, serverPeriodSchema, skillCohortSchema, statsModeSchema } from '../../common/period/period.schemas';
import {
  countSchema,
  isoDateSchema,
  isoDateTimeSchema,
  percentDeltaSchema,
  percentSchema,
  tankIdSchema
} from '../../common/primitives/primitives.schemas';
import { paginatedSchema, paginationQuerySchema, sortQuery } from '../../common/query/query.schemas';
import { leaderboardEntrySchema } from '../../leaderboards/leaderboards.schemas';
import { masteryThresholdSchema, moeThresholdSchema, sweatIndexSchema } from '../../marks/marks.schemas';
import { tierSchema, vehicleFilterSchema, vehicleSummarySchema, vehicleTypeSchema } from '../../vehicles/vehicles.schemas';
import { tankEconomySchema, tankLearningSchema, tankObtainSchema, tankTraitsFilterSchema } from '../insights/insights.schemas';
import { PATCH_VERDICTS, TANK_TREND, TOP_PLAYERS_QUERY } from './tank.constants';

export const tierListRankSchema = z.enum(['S', 'A', 'B', 'C', 'D', 'F']);

export const tankServerStatsRowSchema = z.object({
  vehicle: vehicleSummarySchema,
  period: serverPeriodSchema,
  cohort: skillCohortSchema,
  mode: statsModeSchema,
  battles: countSchema,
  players: countSchema,
  winRate: percentSchema,
  playerWinRate: percentSchema,
  winRateDiff: percentDeltaSchema,
  avgDamage: z.number().nonnegative(),
  avgFrags: z.number().nonnegative(),
  avgSpotted: z.number().nonnegative(),
  avgXp: z.number().nonnegative(),
  avgBlocked: z.number().nonnegative(),
  survivalRate: percentSchema,
  accuracy: percentSchema,
  popularityRank: z.number().int().positive().nullable(),
  computedAt: isoDateTimeSchema
});

export const tankServerStatsSortFieldSchema = z.enum([
  'battles',
  'players',
  'winRate',
  'winRateDiff',
  'avgDamage',
  'avgFrags',
  'avgSpotted',
  'survivalRate',
  'accuracy',
  'tier'
]);

export const tankServerStatsQuerySchema = z.object({
  ...vehicleFilterSchema.shape,
  ...tankTraitsFilterSchema.shape,
  ...sortQuery(tankServerStatsSortFieldSchema).shape,
  ...paginationQuerySchema.shape,
  period: serverPeriodSchema.default('7d'),
  cohort: skillCohortSchema.default('all'),
  mode: statsModeSchema.default('random'),
  minBattles: z.coerce.number().int().nonnegative().default(0)
});

export const tankStatsPageSchema = paginatedSchema(tankServerStatsRowSchema);

export const tierListEntrySchema = z.object({
  vehicle: vehicleSummarySchema,
  rank: tierListRankSchema,
  score: z.number(),
  winRateDiff: percentDeltaSchema,
  battles: countSchema,
  trend: z.enum(['up', 'down', 'flat']).nullable()
});

export const tierListSchema = z.object({
  mode: statsModeSchema,
  period: serverPeriodSchema,
  generatedAt: isoDateTimeSchema,
  entries: z.array(tierListEntrySchema)
});

export const tierListQuerySchema = z.object({
  mode: statsModeSchema.default('random'),
  period: serverPeriodSchema.default('7d'),
  tier: tierSchema.optional(),
  type: vehicleTypeSchema.optional(),
  minBattles: z.coerce.number().int().nonnegative().optional()
});

export const tankDetailQuerySchema = z.object({
  mode: statsModeSchema.default('random'),
  period: serverPeriodSchema.default('30d')
});

export const topPlayersMetricSchema = z.enum(['wn8', 'avgDamage', 'winRate']);

export const topPlayersQuerySchema = z.object({
  period: ratingPeriodSchema.default('overall'),
  metric: topPlayersMetricSchema.default('wn8'),
  limit: z.coerce.number().int().min(1).max(TOP_PLAYERS_QUERY.maxLimit).default(TOP_PLAYERS_QUERY.defaultLimit),
  minBattles: z.coerce.number().int().nonnegative().default(TOP_PLAYERS_QUERY.defaultMinBattles)
});

export const topPlayersSchema = z.object({
  tankId: tankIdSchema,
  period: ratingPeriodSchema,
  metric: topPlayersMetricSchema,
  entries: z.array(leaderboardEntrySchema)
});

export const tankDetailSchema = z.object({
  vehicle: vehicleSummarySchema,
  description: z.string().nullable(),
  specs: z.record(z.string(), z.unknown()).nullable().describe('The full parsed game-client vehicle spec: every module, shell and armour value'),
  stats: z.object({ stock: vehicleStatsSchema.nullable(), top: vehicleStatsSchema.nullable() }),
  serverStats: z.array(tankServerStatsRowSchema),
  moe: moeThresholdSchema.nullable(),
  mastery: masteryThresholdSchema.nullable(),
  topPlayers: z.array(leaderboardEntrySchema),
  obtain: tankObtainSchema,
  economy: tankEconomySchema,
  learning: tankLearningSchema,
  sweat: sweatIndexSchema
});

export const tankTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(TANK_TREND.minDays).max(TANK_TREND.maxDays).default(TANK_TREND.defaultDays),
  mode: statsModeSchema.default('random')
});

export const tankTrendPointSchema = z.object({
  date: isoDateSchema,
  battles: countSchema,
  players: countSchema.nullable(),
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

export const tankTrendSchema = z.object({
  tankId: tankIdSchema,
  mode: statsModeSchema,
  days: countSchema,
  points: z.array(tankTrendPointSchema)
});

const specValueSchema = z.union([z.number(), z.string(), z.boolean()]).nullable();

export const tankPatchChangeSchema = z.object({
  key: z.string().describe('Dot path into the spec summary, e.g. top.reloadTime'),
  before: specValueSchema,
  after: specValueSchema,
  effect: z.enum(['better', 'worse', 'neutral'])
});

export const tankPatchVerdictSchema = z.enum(PATCH_VERDICTS);

export const tankPatchSchema = z.object({
  version: z.string(),
  title: z.string().nullable(),
  date: isoDateTimeSchema.nullable(),
  verdict: tankPatchVerdictSchema,
  changes: z.array(tankPatchChangeSchema)
});

export const tankPatchesSchema = z.object({
  tankId: tankIdSchema,
  patches: z.array(tankPatchSchema)
});
