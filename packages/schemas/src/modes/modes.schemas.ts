import * as z from 'zod';

import { accountIdSchema, countSchema, isoDateTimeSchema, percentSchema } from '../common/primitives/primitives.schemas';
import { vehicleFilterSchema, vehicleSummarySchema } from '../vehicles/vehicles.schemas';
import { CAREER_MODE_SOURCES, CAREER_MODES, MODE_META, MODE_RANKS, PLAY_MODES } from './modes.constants';

export const playModeSchema = z
  .enum(PLAY_MODES)
  .describe('onslaught: Onslaught (comp7); frontline: Front Line (epic battle); ranked: ranked battles; steelHunter: Steel Hunter (battle royale)');

export const modeRankSchema = z.enum(MODE_RANKS);

export const modeParamsSchema = z.object({ mode: playModeSchema });

export const modeMetaQuerySchema = z.object({
  ...vehicleFilterSchema.shape,
  minBattles: z.coerce.number().int().min(1).max(10_000).default(MODE_META.minBattles)
});

export const modeTankSchema = z.object({
  vehicle: vehicleSummarySchema,
  rank: modeRankSchema.nullable(),
  score: z.number().nullable().describe('Win rate over the mode average, shrunk towards zero for small samples, in percentage points'),
  battles: countSchema,
  players: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  avgXp: z.number().nonnegative().nullable(),
  avgFrags: z.number().nonnegative().nullable(),
  survivalRate: percentSchema.nullable()
});

export const modeSeasonSchema = z.object({
  title: z.string(),
  url: z.string().nullable(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullable()
});

export const modeMetaSchema = z.object({
  mode: playModeSchema,
  windowDays: countSchema,
  minBattles: countSchema,
  battles: countSchema,
  players: countSchema,
  winRate: percentSchema.nullable(),
  computedAt: isoDateTimeSchema.nullable(),
  season: modeSeasonSchema.nullable(),
  tanks: z.array(modeTankSchema)
});

export const modeSummarySchema = z.object({
  mode: playModeSchema,
  battles: countSchema,
  players: countSchema,
  tanks: countSchema,
  computedAt: isoDateTimeSchema.nullable(),
  season: modeSeasonSchema.nullable(),
  leaders: z.array(modeTankSchema)
});

export const modesHubSchema = z.object({
  windowDays: countSchema,
  modes: z.array(modeSummarySchema)
});

export const myModeStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(MODE_META.myMaxDays).default(MODE_META.myDefaultDays)
});

export const myModeTankSchema = z.object({
  vehicle: vehicleSummarySchema,
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative()
});

export const myModeLineSchema = z.object({
  mode: playModeSchema,
  battles: countSchema,
  wins: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  avgXp: z.number().nonnegative().nullable(),
  avgFrags: z.number().nonnegative().nullable(),
  survivalRate: percentSchema.nullable(),
  lastBattleAt: isoDateTimeSchema.nullable(),
  tanks: z.array(myModeTankSchema)
});

export const careerModeSchema = z
  .enum(CAREER_MODES)
  .describe(
    'Lifetime blocks Lesta keeps per account: frontline (epic battles), ranked, strongholdSkirmish and strongholdDefense (Stronghold), globalmap (all Global Map fronts)'
  );

export const careerModeTankSchema = z.object({
  vehicle: vehicleSummarySchema,
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable()
});

export const careerModeLineSchema = z.object({
  mode: careerModeSchema,
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  avgXp: z.number().nonnegative().nullable(),
  avgFrags: z.number().nonnegative().nullable(),
  survivalRate: percentSchema.nullable(),
  maxDamage: countSchema.nullable(),
  updatedAt: isoDateTimeSchema.nullable(),
  tanks: z.array(careerModeTankSchema)
});

export const careerModesSchema = z.object({
  accountId: accountIdSchema,
  source: z
    .enum(CAREER_MODE_SOURCES)
    .describe(
      'stored: from the collector (tank breakdown included); live: fetched from Lesta just now, account totals only; none: Lesta returned nothing'
    ),
  modes: z.array(careerModeLineSchema)
});

export const myModeStatsSchema = z.object({
  accountId: accountIdSchema,
  days: countSchema,
  modes: z.array(myModeLineSchema),
  career: z.array(careerModeLineSchema).describe('Lifetime per-mode totals from the Lesta API, for players without mod data')
});
