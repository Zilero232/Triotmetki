import { competitionModeSchema, countSchema, isoDateTimeSchema, percentSchema } from '@otmetki/schemas';
import { z } from 'zod';

import { MAP_STATS } from '../config/map-stats.constants';

const mapStatsTierSchema = z.coerce.number().int().min(MAP_STATS.allTiers).max(MAP_STATS.maxTier);

const mapStatsHourSchema = z
  .number()
  .int()
  .min(0)
  .max(MAP_STATS.hours - 1);

export const mapStatsQuerySchema = z.object({
  tier: mapStatsTierSchema.default(MAP_STATS.allTiers),
  mode: competitionModeSchema.default(MAP_STATS.defaultMode)
});

export const mapRotationRowSchema = z.object({
  arenaId: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  image: z.string().nullable(),
  camouflageType: z.string().nullable(),
  battles: countSchema,
  share: percentSchema,
  modBattles: countSchema,
  replayBattles: countSchema
});

export const mapRotationSchema = z.object({
  tier: mapStatsTierSchema,
  mode: competitionModeSchema,
  windowDays: countSchema,
  battles: countSchema,
  rows: z.array(mapRotationRowSchema),
  computedAt: isoDateTimeSchema.nullable()
});

export const queueCellSchema = z.object({
  tier: mapStatsTierSchema,
  hour: mapStatsHourSchema,
  samples: countSchema,
  avgSec: z.number().nonnegative(),
  medianSec: z.number().nonnegative(),
  p90Sec: z.number().nonnegative()
});

export const queueNowSchema = z.object({
  hour: mapStatsHourSchema,
  selected: queueCellSchema.nullable(),
  fastest: queueCellSchema.nullable(),
  tiers: z.array(queueCellSchema)
});

export const mapQueueSchema = z.object({
  tier: mapStatsTierSchema,
  mode: competitionModeSchema,
  timezone: z.string(),
  windowDays: countSchema,
  minSamples: countSchema,
  cells: z.array(queueCellSchema),
  now: queueNowSchema,
  computedAt: isoDateTimeSchema.nullable()
});
