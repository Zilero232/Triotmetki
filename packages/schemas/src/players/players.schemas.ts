import type { MoeThresholdPercentiles } from '@otmetki/ratings';

import * as z from 'zod';

import { recentPeriodSchema } from '../common/period/period.schemas';
import {
  accountIdSchema,
  clanIdSchema,
  countSchema,
  isoDateSchema,
  isoDateTimeSchema,
  percentDeltaSchema,
  percentSchema
} from '../common/primitives/primitives.schemas';
import { PAGINATION } from '../common/query/query.constants';
import { paginatedSchema, paginationQuerySchema, sortQuery } from '../common/query/query.schemas';
import { ratingValueSchema, statsBlockSchema } from '../common/rating/rating.schemas';
import { vehicleFilterSchema, vehicleSummarySchema } from '../vehicles/vehicles.schemas';
import { PLAYER_ACTIVITY, PLAYER_TANKS, POPULAR_PLAYERS } from './players.constants';

const playerClanSchema = z.object({
  clanId: clanIdSchema,
  tag: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  role: z.string(),
  emblem: z.url().nullable(),
  joinedAt: isoDateTimeSchema.nullable()
});

export const playerSummarySchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string(),
  clan: playerClanSchema.nullable(),
  createdAt: isoDateTimeSchema.nullable(),
  lastBattleAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
  isTracked: z.boolean(),
  overall: statsBlockSchema,
  marks: z.object({
    moe3: countSchema,
    moe2: countSchema,
    moe1: countSchema,
    mastery: countSchema,
    tanksOwned: countSchema
  })
});

const recentPeriodStatsSchema = z.object({
  period: recentPeriodSchema,
  from: isoDateTimeSchema.nullable(),
  to: isoDateTimeSchema.nullable(),
  stats: statsBlockSchema.nullable()
});

export const recentPeriodsSchema = z.array(recentPeriodStatsSchema);

export const playerTankRowSchema = z.object({
  vehicle: vehicleSummarySchema,
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  avgFrags: z.number().nonnegative().nullable(),
  avgXp: z.number().nonnegative().nullable(),
  survivalRate: percentSchema.nullable(),
  wn8: ratingValueSchema,
  markOfMastery: z.number().int().min(0).max(4),
  marksOnGun: z.number().int().min(0).max(3).nullable(),
  moePercent: percentSchema.nullable(),
  damagePercentile: percentSchema.nullable(),
  maxFrags: countSchema.nullable(),
  maxXp: countSchema.nullable(),
  lastBattleAt: isoDateTimeSchema.nullable(),
  recent: recentPeriodStatsSchema.nullable()
});

const playerTankSortFieldSchema = z.enum(['battles', 'winRate', 'avgDamage', 'wn8', 'marksOnGun', 'moePercent', 'lastBattleAt', 'tier']);

export const playerTanksQuerySchema = z.object({
  ...vehicleFilterSchema.shape,
  ...sortQuery(playerTankSortFieldSchema).shape,
  ...paginationQuerySchema.shape,
  limit: z
    .union([z.literal('all'), z.coerce.number().int().min(1).max(PLAYER_TANKS.maxLimit)])
    .default(PAGINATION.defaultLimit)
    .describe(`Page size up to ${PLAYER_TANKS.maxLimit}, or "all" for every tank in one page`),
  period: recentPeriodSchema.optional(),
  minBattles: z.coerce.number().int().nonnegative().default(0)
});

export const timeSeriesGranularitySchema = z.enum(['day', 'week', 'month']);

export const timeSeriesMetricSchema = z.enum(['wn8', 'winRate', 'avgDamage', 'battles', 'broneIndex', 'eff']);

export const timeSeriesPointSchema = z.object({
  at: isoDateTimeSchema,
  value: z.number().nullable(),
  battles: countSchema.optional()
});

const timeSeriesMarkerSchema = z.object({
  at: isoDateTimeSchema,
  kind: z.enum(['patch', 'event']),
  label: z.string()
});

export const timeSeriesSchema = z.object({
  metric: timeSeriesMetricSchema,
  granularity: timeSeriesGranularitySchema,
  points: z.array(timeSeriesPointSchema),
  markers: z.array(timeSeriesMarkerSchema)
});

export const timeSeriesQuerySchema = z.object({
  metric: timeSeriesMetricSchema,
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
  granularity: timeSeriesGranularitySchema.default('day')
});

const activityDaySchema = z.object({
  date: isoDateSchema,
  battles: countSchema,
  winRate: percentSchema.nullable()
});

export const playerHistoryEntrySchema = z.object({
  kind: z.enum(['nickname', 'clan']),
  value: z.string(),
  from: isoDateTimeSchema.nullable(),
  to: isoDateTimeSchema.nullable()
});

export const playerProfileSchema = z.object({
  summary: playerSummarySchema,
  recent: recentPeriodsSchema
});

export const playerTanksPageSchema = paginatedSchema(playerTankRowSchema);

export const activityQuerySchema = z.object({
  days: z.coerce.number().int().min(PLAYER_ACTIVITY.minDays).max(PLAYER_ACTIVITY.maxDays).default(PLAYER_ACTIVITY.defaultDays)
});

export const activitySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  days: z.array(activityDaySchema)
});

export const nicknameHistorySchema = z.array(playerHistoryEntrySchema);

export const moeThresholdValuesSchema = z.object({
  p65: z.number().nonnegative(),
  p85: z.number().nonnegative(),
  p95: z.number().nonnegative(),
  p100: z.number().nonnegative().nullable()
}) satisfies z.ZodType<MoeThresholdPercentiles>;

export const playerMarkRowSchema = z.object({
  vehicle: vehicleSummarySchema,
  battles: countSchema,
  marksOnGun: z.number().int().min(0).max(3).nullable(),
  markOfMastery: z.number().int().min(0).max(4),
  moePercent: percentSchema.nullable().describe('Current MoE percent from the mod; null without mod data'),
  movingDamage: z.number().nonnegative().nullable().describe('The game-client moving average of combined damage, from the mod'),
  avgCombinedDamage: z
    .number()
    .nonnegative()
    .nullable()
    .describe(
      'Average of damage + max(radio assist, track assist, stun assist) over the last mod battles, or the average damage when there are none'
    ),
  combinedDamageSource: z.enum(['battles', 'damage']).nullable(),
  thresholds: moeThresholdValuesSchema.nullable(),
  nextMarkPercent: z.number().int().nullable(),
  damageToNextMark: z.number().nonnegative().nullable(),
  updatedAt: isoDateTimeSchema.nullable()
});

export const playerMarksSchema = z.object({
  summary: z.object({
    moe3: countSchema,
    moe2: countSchema,
    moe1: countSchema,
    mastery: countSchema,
    eligible: countSchema
  }),
  items: z.array(playerMarkRowSchema)
});

export const insightsPeriodSchema = z.enum(['overall', ...recentPeriodSchema.options]);

export const insightsQuerySchema = z.object({
  period: insightsPeriodSchema.default('30d')
});

export const groupInsightSchema = z.object({
  key: z.string(),
  battles: countSchema,
  winRate: percentSchema.nullable(),
  serverWinRate: percentSchema.nullable(),
  winRateDelta: percentDeltaSchema.nullable(),
  damageRatio: z.number().nullable()
});

export const tankInsightSchema = z.object({
  vehicle: vehicleSummarySchema,
  battles: countSchema,
  winRate: percentSchema,
  serverWinRate: percentSchema.nullable(),
  winRateDelta: percentDeltaSchema.nullable(),
  avgDamage: z.number(),
  serverAvgDamage: z.number().nullable(),
  damageRatio: z.number().nullable()
});

const insightTipCodeSchema = z.enum(['low_damage_tank', 'no_weak_spots', 'not_enough_battles', 'weak_class', 'weak_tier']);

export const playerInsightsSchema = z.object({
  period: insightsPeriodSchema,
  battles: countSchema,
  byClass: z.array(groupInsightSchema),
  byTier: z.array(groupInsightSchema),
  weakTanks: z.array(tankInsightSchema),
  strongTanks: z.array(tankInsightSchema),
  tips: z.array(
    z.object({
      code: insightTipCodeSchema,
      params: z.record(z.string(), z.union([z.number(), z.string()]))
    })
  )
});

export const playtimeCellSchema = z.object({
  weekday: z.number().int().min(0).max(6).describe('0 = Monday … 6 = Sunday, Moscow time'),
  hour: z.number().int().min(0).max(23).describe('Hour of day, Moscow time'),
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

export const playtimeSchema = z.object({
  battles: countSchema,
  source: z
    .enum(['battles', 'snapshots', 'none'])
    .describe('battles: exact start times of mod battles; snapshots: API polls, placed at the poll time (approximate); none: no data'),
  cells: z.array(playtimeCellSchema)
});

export const popularPlayersQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(POPULAR_PLAYERS.maxDays).default(POPULAR_PLAYERS.defaultDays),
  limit: z.coerce.number().int().min(1).max(POPULAR_PLAYERS.maxLimit).default(POPULAR_PLAYERS.defaultLimit)
});

export const popularPlayerSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string(),
  clanTag: z.string().nullable(),
  views: countSchema,
  wn8: ratingValueSchema
});

export const popularPlayersSchema = z.object({
  days: countSchema,
  items: z.array(popularPlayerSchema)
});

export const playerAchievementSchema = z.object({
  section: z.string().nullable(),
  name: z.string(),
  title: z.string(),
  titleEn: z.string().nullable().describe('English title from the Lesta encyclopedia; null until it is synced'),
  description: z.string().nullable(),
  descriptionEn: z.string().nullable(),
  image: z.string().nullable(),
  imageBig: z.string().nullable(),
  count: countSchema,
  maxSeries: countSchema.nullable()
});

export const playerAchievementsSchema = z.object({
  items: z.array(playerAchievementSchema)
});

export const playerRecordSchema = z.object({
  value: countSchema,
  vehicle: vehicleSummarySchema.nullable(),
  achievedAt: isoDateTimeSchema.nullable().describe('Earliest stored snapshot that already showed the record; null when it predates our history')
});

export const playerAssistSchema = z.object({
  avgAssisted: z.number().nonnegative().nullable().describe("Average damage by the player's spotting and tracking per battle"),
  avgRadio: z.number().nonnegative().nullable(),
  avgTrack: z.number().nonnegative().nullable(),
  avgStun: z.number().nonnegative().nullable()
});

export const playerCareerSchema = z.object({
  accountId: accountIdSchema,
  source: z.enum(['stored', 'live']).describe('stored: the latest collector snapshot; live: fetched from Lesta because we have no snapshot yet'),
  records: z.object({
    maxDamage: playerRecordSchema.nullable(),
    maxXp: playerRecordSchema.nullable(),
    maxFrags: playerRecordSchema.nullable()
  }),
  assist: playerAssistSchema.nullable().describe('Random-battle assist averages; the base for an assist-aware rating'),
  lastBattleAt: isoDateTimeSchema.nullable(),
  logoutAt: isoDateTimeSchema.nullable().describe('When the player last left the game client, as Lesta reports it')
});
