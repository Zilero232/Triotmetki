import { z } from 'zod';

import { countSchema, percentSchema, tankIdSchema } from '../common/primitives/primitives.schemas';
import { vehicleSummarySchema } from '../vehicles/vehicles.schemas';

const pointSchema = z.tuple([z.number(), z.number()]);

export const mapsQuerySchema = z.object({
  mode: z.string().trim().min(1).max(32).optional(),
  search: z.string().trim().min(1).max(64).optional()
});

export const mapParamsSchema = z.object({
  idOrSlug: z.string().trim().min(1).max(64)
});

export const mapSummarySchema = z.object({
  arenaId: z.string(),
  slug: z.string(),
  name: z.string(),
  nameEn: z.string().nullable().describe('English name from the Lesta encyclopedia; null until it is synced'),
  image: z.url().nullable(),
  sizeMeters: countSchema.nullable(),
  camouflage: z.string().nullable(),
  modes: z.array(z.string())
});

const mapModeSchema = z.object({
  mode: z.string(),
  minimap: z.url().nullable(),
  bases: z.record(z.string(), z.array(pointSchema)),
  spawns: z.record(z.string(), z.array(pointSchema)),
  controlPoints: z.array(pointSchema)
});

const mapTeamStatsSchema = z.object({
  team: z.number().int().positive(),
  battles: countSchema,
  winRate: percentSchema.nullable()
});

export const mapStatsSchema = z
  .object({
    source: z.enum(['battles', 'replays']),
    battles: countSchema,
    teams: z.array(mapTeamStatsSchema)
  })
  .describe('Win rate by team (spawn side) from mod battles, or from uploaded replays when there are no mod battles');

export const mapDetailSchema = mapSummarySchema.extend({
  description: z.string().nullable(),
  descriptionEn: z.string().nullable(),
  boundingBox: z.object({ bottomLeft: pointSchema, upperRight: pointSchema }).nullable(),
  maxPlayersInTeam: countSchema.nullable(),
  roundLengthSec: countSchema.nullable(),
  gameModes: z.array(mapModeSchema),
  stats: mapStatsSchema.nullable()
});

export const mapListSchema = z.array(mapSummarySchema);

export const tankMapParamsSchema = z.object({
  id: tankIdSchema
});

export const mapRefSchema = mapSummarySchema.pick({ arenaId: true, slug: true, name: true, nameEn: true, image: true });

export const tankMapSampleSchema = z.object({
  battles: countSchema.describe('Random battles of this tank on this map from the game mod and uploaded replays, one per player and battle'),
  isEnough: z.boolean().describe('Whether the sample reaches the minimum; below it the rates stay hidden'),
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

const tankMapRowSchema = tankMapSampleSchema.extend({ map: mapRefSchema });

const mapTankRowSchema = tankMapSampleSchema.extend({ vehicle: vehicleSummarySchema });

const tankMapWindowSchema = z.object({
  windowDays: countSchema,
  minBattles: countSchema,
  battles: countSchema
});

export const tankMapsSchema = tankMapWindowSchema.extend({
  tankId: tankIdSchema,
  maps: z.array(tankMapRowSchema)
});

export const mapTanksSchema = tankMapWindowSchema.extend({
  arenaId: z.string(),
  tanks: z.array(mapTankRowSchema)
});
