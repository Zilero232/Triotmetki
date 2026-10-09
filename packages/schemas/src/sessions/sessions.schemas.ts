import * as z from 'zod';

import { accountIdSchema, countSchema, isoDateSchema, isoDateTimeSchema, percentSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { paginatedSchema } from '../common/query/query.schemas';
import { statsBlockSchema } from '../common/rating/rating.schemas';
import { vehicleSummarySchema } from '../vehicles/vehicles.schemas';

export const sessionKindSchema = z.enum(['day', 'live']);
export const sessionSourceSchema = z.enum(['api', 'mod']);
export const battleResultSchema = z.enum(['win', 'loss', 'draw']);

export const shotSchema = z.object({
  at: z.number().nonnegative(),
  hit: z.boolean(),
  pierced: z.boolean(),
  damage: countSchema,
  shellKind: z.string().nullable()
});

export const sessionBattleSchema = z.object({
  id: uuidSchema,
  arenaUniqueId: z.string(),
  vehicle: vehicleSummarySchema,
  arenaId: z.string(),
  mapName: z.string(),
  battleType: z.string(),
  result: battleResultSchema,
  survived: z.boolean(),
  damageDealt: countSchema,
  damageAssisted: countSchema,
  damageBlocked: countSchema,
  spotted: countSchema,
  frags: countSchema,
  xp: countSchema,
  credits: z.number().int().nullable(),
  moePercent: percentSchema.nullable(),
  moePercentDelta: z.number().nullable(),
  queueTimeSec: z.number().nonnegative().nullable(),
  durationSec: countSchema.nullable(),
  shots: z.array(shotSchema).nullable(),
  startedAt: isoDateTimeSchema
});

export const sessionTankDeltaSchema = z.object({
  vehicle: vehicleSummarySchema,
  stats: statsBlockSchema
});

export const sessionSchema = z.object({
  id: uuidSchema,
  accountId: accountIdSchema,
  kind: sessionKindSchema,
  source: sessionSourceSchema,
  isLive: z.boolean(),
  day: isoDateSchema.nullable(),
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.nullable(),
  stats: statsBlockSchema,
  credits: z.number().int().nullable(),
  tanks: z.array(sessionTankDeltaSchema),
  battles: z
    .array(sessionBattleSchema)
    .nullable()
    .describe('Individual battles, only for sessions the mod reported (source=mod); null for day sessions built from Lesta API diffs (source=api)'),
  best: sessionTankDeltaSchema.nullable(),
  worst: sessionTankDeltaSchema.nullable()
});

export const sessionListItemSchema = sessionSchema.pick({
  id: true,
  kind: true,
  source: true,
  isLive: true,
  day: true,
  startedAt: true,
  endedAt: true,
  stats: true
});

export const sessionsPageSchema = paginatedSchema(sessionListItemSchema);
