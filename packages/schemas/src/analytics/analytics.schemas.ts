import * as z from 'zod';

import { accountIdSchema, countSchema, isoDateTimeSchema, percentSchema, tankIdSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { paginationQuerySchema } from '../common/query/query.schemas';
import { vehicleSummarySchema, vehicleTypeSchema } from '../vehicles/vehicles.schemas';
import { ANALYTICS_BATTLES_QUERY, ANALYTICS_GRANULARITIES, ANALYTICS_PERIODS, BATTLE_MISTAKES, PLAYLIST_REASONS } from './analytics.constants';

export const analyticsPeriodSchema = z.enum(ANALYTICS_PERIODS);

export const analyticsGranularitySchema = z.enum(ANALYTICS_GRANULARITIES);

export const playlistReasonSchema = z.enum(PLAYLIST_REASONS);

const battleMistakeCodeSchema = z.enum(BATTLE_MISTAKES);

export const analyticsAccountQuerySchema = z.object({
  account: accountIdSchema.optional()
});

export const analyticsQuerySchema = analyticsAccountQuerySchema.extend({
  period: analyticsPeriodSchema.default('d90')
});

export const analyticsTankParamsSchema = z.object({
  tankId: tankIdSchema
});

export const analyticsTankQuerySchema = analyticsAccountQuerySchema.extend({
  granularity: analyticsGranularitySchema.default('week')
});

export const analyticsBattleParamsSchema = z.object({
  id: uuidSchema
});

export const analyticsBattlesQuerySchema = analyticsAccountQuerySchema.extend({
  tankId: tankIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(ANALYTICS_BATTLES_QUERY.maxLimit).default(ANALYTICS_BATTLES_QUERY.defaultLimit),
  offset: paginationQuerySchema.shape.offset
});

export const playlistQuerySchema = analyticsAccountQuerySchema.extend({
  seed: z.coerce.number().int().min(0).max(1_000_000).optional()
});

export const statLineSchema = z.object({
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  wn8: z.number().nullable(),
  survivalRate: percentSchema.nullable()
});

export const breakdownRowSchema = statLineSchema.extend({
  key: z.string()
});

export const analyticsBreakdownSchema = z.object({
  byTier: z.array(breakdownRowSchema),
  byClass: z.array(breakdownRowSchema),
  byNation: z.array(breakdownRowSchema)
});

export const hourStatSchema = z.object({
  hour: z.number().int().min(0).max(23),
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

export const weekdayStatSchema = z.object({
  weekday: z.number().int().min(0).max(6).describe('0 = Sunday … 6 = Saturday, Moscow time'),
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

export const trendPointSchema = z.object({
  at: isoDateTimeSchema,
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  wn8: z.number().nullable()
});

const tiltStepSchema = z.object({
  afterLosses: countSchema,
  battles: countSchema,
  winRate: percentSchema.nullable()
});

export const tiltSchema = z.object({
  battles: countSchema,
  longestLossStreak: countSchema,
  currentLossStreak: countSchema,
  steps: z.array(tiltStepSchema),
  stopAfter: countSchema.nullable()
});

export const sessionCompareRowSchema = z.object({
  id: uuidSchema,
  startedAt: isoDateTimeSchema,
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  wn8: z.number().nullable(),
  winRateDelta: z.number().nullable(),
  avgDamageDelta: z.number().nullable()
});

export const analyticsOverviewSchema = z.object({
  accountId: accountIdSchema,
  period: analyticsPeriodSchema,
  modBattles: countSchema,
  totals: statLineSchema,
  breakdown: analyticsBreakdownSchema,
  hours: z.array(hourStatSchema),
  weekdays: z.array(weekdayStatSchema),
  trend: z.array(trendPointSchema),
  tilt: tiltSchema,
  sessions: z.array(sessionCompareRowSchema)
});

const moePointSchema = z.object({
  at: isoDateTimeSchema,
  percent: z.number()
});

export const analyticsTankSchema = z.object({
  accountId: accountIdSchema,
  vehicle: vehicleSummarySchema.nullable(),
  granularity: analyticsGranularitySchema,
  totals: statLineSchema,
  points: z.array(trendPointSchema),
  moe: z.array(moePointSchema)
});

export const mapClassRowSchema = statLineSchema.extend({
  arenaId: z.string(),
  vehicleClass: vehicleTypeSchema.nullable(),
  team: z.number().int().min(0).max(2).nullable()
});

export const mapStatSchema = statLineSchema.extend({
  arenaId: z.string(),
  name: z.string().nullable(),
  winRateDelta: z.number().nullable()
});

export const analyticsMapsSchema = z.object({
  accountId: accountIdSchema,
  period: analyticsPeriodSchema,
  totals: statLineSchema,
  maps: z.array(mapStatSchema),
  rows: z.array(mapClassRowSchema),
  weakMaps: z.array(z.string()),
  strongMaps: z.array(z.string())
});

export const platoonMateSchema = statLineSchema.extend({
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  winRateDelta: z.number().nullable()
});

export const analyticsPlatoonsSchema = z.object({
  accountId: accountIdSchema,
  period: analyticsPeriodSchema,
  tracked: countSchema,
  solo: statLineSchema,
  platoon: statLineSchema,
  mates: z.array(platoonMateSchema)
});

export const myBattleSchema = z.object({
  id: uuidSchema,
  startedAt: isoDateTimeSchema,
  tankId: tankIdSchema,
  vehicle: vehicleSummarySchema.nullable(),
  arenaId: z.string(),
  mapName: z.string().nullable(),
  battleType: z.string(),
  result: z.enum(['win', 'loss', 'draw']),
  team: z.number().int().nullable(),
  damageDealt: countSchema,
  damageAssisted: countSchema,
  damageBlocked: countSchema,
  frags: countSchema,
  spotted: countSchema,
  xp: countSchema,
  credits: z.number().int().nullable(),
  survived: z.boolean(),
  lifetimeSec: countSchema.nullable(),
  durationSec: countSchema.nullable(),
  moePercent: z.number().nullable(),
  moePercentDelta: z.number().nullable(),
  platoonSize: z.number().int().min(1).max(3).nullable()
});

export const myBattlesPageSchema = z.object({
  items: z.array(myBattleSchema),
  total: countSchema,
  limit: z.number().int().positive(),
  offset: countSchema
});

export const tankReferenceSchema = z.object({
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  avgAssisted: z.number().nonnegative().nullable(),
  avgSpotted: z.number().nonnegative().nullable(),
  avgFrags: z.number().nonnegative().nullable(),
  avgBlocked: z.number().nonnegative().nullable()
});

export const battleMistakeSchema = z.object({
  code: battleMistakeCodeSchema,
  value: z.number().nullable(),
  reference: z.number().nullable()
});

export const shotRollSchema = z.object({
  damage: countSchema,
  nominal: z.number().int().positive(),
  ratio: z.number()
});

export const battleAnalysisSchema = z.object({
  battle: myBattleSchema,
  reference: tankReferenceSchema.nullable(),
  breakdown: z.object({
    dealt: countSchema,
    assistedRadio: countSchema,
    assistedTrack: countSchema,
    assistedStun: countSchema,
    blocked: countSchema
  }),
  efficiency: z.object({
    damage: z.number().nullable(),
    assisted: z.number().nullable(),
    spotted: z.number().nullable(),
    frags: z.number().nullable()
  }),
  accuracy: z.object({
    shotsFired: countSchema.nullable(),
    hitRate: percentSchema.nullable(),
    penRate: percentSchema.nullable()
  }),
  moe: z.object({
    percent: z.number().nullable(),
    delta: z.number().nullable(),
    combined: countSchema,
    movingAverage: z.number().nullable(),
    shortfall: z.number().nullable()
  }),
  rolls: z.array(shotRollSchema),
  mistakes: z.array(battleMistakeSchema)
});

export const rngBucketSchema = z.object({
  from: z.number(),
  to: z.number(),
  shots: countSchema,
  share: percentSchema.nullable()
});

export const rngDistanceSchema = z.object({
  from: countSchema,
  to: countSchema.nullable(),
  shots: countSchema,
  pierced: countSchema,
  penRate: percentSchema.nullable()
});

export const analyticsRngSchema = z.object({
  accountId: accountIdSchema,
  period: analyticsPeriodSchema,
  battles: countSchema,
  shots: countSchema,
  meanRoll: z.number().nullable(),
  withinSpread: percentSchema.nullable(),
  buckets: z.array(rngBucketSchema),
  distance: z.array(rngDistanceSchema),
  accuracy: z.object({
    shotsFired: countSchema,
    hitRate: percentSchema.nullable(),
    penRate: percentSchema.nullable()
  })
});

const garageStateSchema = z.enum(['ready', 'noLink', 'noGarage']);

export const playlistItemSchema = z.object({
  vehicle: vehicleSummarySchema,
  reasons: z.array(playlistReasonSchema),
  battles: countSchema,
  winRate: percentSchema.nullable(),
  moePercent: z.number().nullable(),
  nextMarkPercent: z.number().nullable(),
  damageToNextMark: z.number().nullable(),
  daysSinceBattle: countSchema.nullable(),
  isFirstWinAvailable: z.boolean()
});

export const playlistSchema = z.object({
  accountId: accountIdSchema.nullable(),
  state: garageStateSchema,
  isExtended: z.boolean(),
  size: z.number().int().positive(),
  seed: countSchema,
  items: z.array(playlistItemSchema)
});

export const firstWinTankSchema = z.object({
  vehicle: vehicleSummarySchema,
  isTaken: z.boolean(),
  lastBattleAt: isoDateTimeSchema.nullable()
});

export const firstWinSchema = z.object({
  accountId: accountIdSchema.nullable(),
  state: garageStateSchema,
  resetAt: isoDateTimeSchema,
  nextResetAt: isoDateTimeSchema,
  taken: countSchema,
  available: countSchema,
  tanks: z.array(firstWinTankSchema)
});
