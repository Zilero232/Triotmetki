import * as z from 'zod';

import { accountIdSchema, countSchema, isoDateSchema, isoDateTimeSchema, tankIdSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { SEASON, SHELL_REASONS, TANK_CHALLENGE_METRICS } from './progression.constants';

export const tankChallengeMetricSchema = z.enum(TANK_CHALLENGE_METRICS);

const tankProgressSchema = z.object({
  accountId: accountIdSchema,
  tankId: tankIdSchema,
  level: z.number().int().min(1),
  xp: countSchema,
  levelXp: countSchema,
  nextLevelXp: countSchema.nullable(),
  battles: countSchema,
  updatedAt: isoDateTimeSchema
});

export const tankProgressListSchema = z.object({
  isAccruing: z.boolean(),
  items: z.array(tankProgressSchema)
});

export const tankChallengeSchema = z.object({
  code: z.string(),
  metric: tankChallengeMetricSchema,
  target: z.number().nonnegative(),
  threshold: z.number().nonnegative().nullable(),
  progress: z.number().nonnegative(),
  completedAt: isoDateTimeSchema.nullable(),
  shells: countSchema,
  points: countSchema
});

const tankChallengeSetSchema = z.object({
  accountId: accountIdSchema,
  tankId: tankIdSchema,
  items: z.array(tankChallengeSchema)
});

export const tankChallengesSchema = z.object({
  weekStart: isoDateSchema,
  endsAt: isoDateTimeSchema,
  sets: z.array(tankChallengeSetSchema)
});

export const shellReasonSchema = z.enum(SHELL_REASONS);

const shellEntrySchema = z.object({
  id: uuidSchema,
  amount: z.number().int(),
  reason: shellReasonSchema,
  createdAt: isoDateTimeSchema
});

export const shellsSchema = z.object({
  balance: countSchema,
  earned: countSchema,
  spent: countSchema,
  entries: z.array(shellEntrySchema)
});

const seasonCodeSchema = z.string().regex(SEASON.codePattern);

const seasonSchema = z.object({
  code: seasonCodeSchema,
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema
});

export const seasonRewardSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('shells'), level: z.number().int().positive(), amount: countSchema, isClaimed: z.boolean() }),
  z.object({ kind: z.literal('cosmetic'), level: z.number().int().positive(), code: z.string(), isClaimed: z.boolean() })
]);

export const seasonTrackSchema = z.object({
  season: seasonSchema,
  isAccruing: z.boolean(),
  points: countSchema,
  level: countSchema,
  maxLevel: z.number().int().positive(),
  levelPoints: countSchema,
  nextLevelPoints: countSchema.nullable(),
  rewards: z.array(seasonRewardSchema)
});

export const seasonHistoryEntrySchema = z.object({
  season: seasonCodeSchema,
  points: countSchema,
  level: countSchema
});

export const seasonHistorySchema = z.object({
  items: z.array(seasonHistoryEntrySchema)
});
