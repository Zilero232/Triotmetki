import { z } from 'zod';

import { accountIdSchema, countSchema, isoDateSchema, isoDateTimeSchema, tankIdSchema } from '../common/primitives/primitives.schemas';
import { modSyncLibrariesSchema } from '../mod-sync/mod-sync.schemas';

const exportedOverallSchema = z.object({
  capturedAt: isoDateTimeSchema,
  battles: countSchema,
  wins: countSchema,
  losses: countSchema,
  draws: countSchema,
  damageDealt: countSchema,
  damageReceived: countSchema,
  frags: countSchema,
  spotted: countSchema,
  xp: countSchema,
  survived: countSchema,
  hits: countSchema,
  shots: countSchema,
  capturePoints: countSchema,
  droppedCapturePoints: countSchema,
  globalRating: countSchema.nullable()
});

const exportedTankSchema = z.object({
  accountId: accountIdSchema,
  tankId: tankIdSchema,
  battles: countSchema,
  wins: countSchema,
  markOfMastery: countSchema,
  marksOnGun: countSchema.nullable(),
  lastBattleAt: isoDateTimeSchema.nullable()
});

const exportedAccountSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string(),
  createdAt: isoDateTimeSchema.nullable(),
  lastBattleAt: isoDateTimeSchema.nullable(),
  overall: exportedOverallSchema.nullable()
});

export const rawStatsExportSchema = z.object({
  generatedAt: isoDateTimeSchema,
  accounts: z.array(exportedAccountSchema),
  tanks: z.array(exportedTankSchema),
  modSync: modSyncLibrariesSchema.optional()
});

const exportedSessionSchema = z.object({
  accountId: accountIdSchema,
  source: z.string(),
  kind: z.string(),
  day: isoDateSchema.nullable(),
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.nullable(),
  battles: countSchema,
  wins: countSchema,
  losses: countSchema,
  damageDealt: countSchema,
  damageAssisted: countSchema,
  damageBlocked: countSchema,
  frags: countSchema,
  spotted: countSchema,
  xp: countSchema,
  survived: countSchema,
  wn8: z.number().nullable(),
  broneIndex: z.number().nullable()
});

const exportedBattleSchema = z.object({
  accountId: accountIdSchema,
  arenaUniqueId: z.string(),
  tankId: tankIdSchema,
  arenaId: z.string(),
  battleType: z.string(),
  result: z.string(),
  damageDealt: countSchema,
  damageAssistedRadio: countSchema,
  damageAssistedTrack: countSchema,
  damageBlocked: countSchema,
  damageReceived: countSchema,
  spotted: countSchema,
  frags: countSchema,
  xp: countSchema,
  credits: z.number().int().nullable(),
  survived: z.boolean(),
  moePercent: z.number().nullable(),
  moePercentDelta: z.number().nullable(),
  startedAt: isoDateTimeSchema
});

const exportedTankProgressSchema = z.object({
  accountId: accountIdSchema,
  tankId: tankIdSchema,
  level: countSchema,
  xp: countSchema,
  battles: countSchema
});

export const analyticsExportSchema = z.object({
  generatedAt: isoDateTimeSchema,
  sessions: z.array(exportedSessionSchema),
  battles: z.array(exportedBattleSchema),
  tankProgress: z.array(exportedTankProgressSchema)
});
