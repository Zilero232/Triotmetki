import {
  accountIdSchema,
  battleResultSchema,
  countSchema,
  isoDateTimeSchema,
  tankIdSchema,
  tierSchema,
  uuidSchema,
  vehicleSummarySchema,
  vehicleTypeSchema
} from '@otmetki/schemas';
import { z } from 'zod';

import { BEST_BATTLE_METRICS, BEST_BATTLE_PERIODS, BEST_BATTLE_SOURCES } from '../config/facets.constants';
import { BEST_BATTLES } from '../config/feed.constants';

export const bestBattlePeriodSchema = z.enum(BEST_BATTLE_PERIODS);

export const bestBattleMetricSchema = z.enum(BEST_BATTLE_METRICS);

export const bestBattlesFacetsQuerySchema = z.object({
  period: bestBattlePeriodSchema.default(BEST_BATTLES.defaultPeriod)
});

export const bestBattlesQuerySchema = bestBattlesFacetsQuerySchema.extend({
  metric: bestBattleMetricSchema.default(BEST_BATTLES.defaultMetric),
  tankId: tankIdSchema.optional(),
  arenaId: z.string().trim().min(1).max(64).optional(),
  medal: z.string().trim().min(1).max(64).optional(),
  tier: tierSchema.optional(),
  type: vehicleTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(BEST_BATTLES.maxLimit).default(BEST_BATTLES.defaultLimit),
  cursor: z
    .string()
    .regex(/^\d{1,6}$/)
    .optional()
});

const bestBattleMedalSchema = z.object({
  name: z.string(),
  title: z.string(),
  image: z.string().nullable()
});

const bestBattleArenaSchema = z.object({
  arenaId: z.string(),
  name: z.string()
});

export const bestBattleSchema = z.object({
  key: z.string(),
  rank: z.number().int().positive(),
  source: z.enum(BEST_BATTLE_SOURCES),
  accountId: accountIdSchema,
  nickname: z.string(),
  vehicle: vehicleSummarySchema,
  arena: bestBattleArenaSchema.nullable(),
  result: battleResultSchema.nullable(),
  damage: countSchema.nullable(),
  assisted: countSchema.nullable(),
  spotted: countSchema.nullable(),
  frags: countSchema.nullable(),
  xp: countSchema.nullable(),
  blocked: countSchema.nullable(),
  medals: z.array(bestBattleMedalSchema),
  playedAt: isoDateTimeSchema,
  replayId: uuidSchema.nullable()
});

export const bestBattlesPageSchema = z.object({
  period: bestBattlePeriodSchema,
  metric: bestBattleMetricSchema,
  since: isoDateTimeSchema,
  items: z.array(bestBattleSchema),
  nextCursor: z.string().nullable()
});

export const bestBattlesFacetsSchema = z.object({
  period: bestBattlePeriodSchema,
  since: isoDateTimeSchema,
  battles: countSchema,
  topDamage: countSchema.nullable(),
  medals: z.array(bestBattleMedalSchema.extend({ battles: countSchema })),
  tanks: z.array(z.object({ vehicle: vehicleSummarySchema, battles: countSchema })),
  arenas: z.array(bestBattleArenaSchema.extend({ battles: countSchema })),
  computedAt: isoDateTimeSchema
});
