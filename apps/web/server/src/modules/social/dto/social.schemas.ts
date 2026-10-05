import {
  accountIdSchema,
  countSchema,
  isoDateSchema,
  isoDateTimeSchema,
  leagueMetricSchema,
  leagueScopeSchema,
  leagueTierSchema,
  leagueZoneSchema,
  nicknameSchema,
  tankIdSchema,
  uuidSchema,
  vehicleTypeSchema,
  weeklyChallengeMetricSchema
} from '@otmetki/schemas';
import { z } from 'zod';

import { WRAPPED } from '../config/wrapped.constants';

export const challengeRuleSchema = z.object({
  code: z.string(),
  metric: weeklyChallengeMetricSchema,
  target: z.number(),
  threshold: z.number().nullable(),
  vehicleType: vehicleTypeSchema.nullable()
});

export const feedBadgeSchema = z.object({
  code: z.string(),
  challenge: challengeRuleSchema.nullable()
});

export const feedItemSchema = z.object({
  kind: z.enum(['mark', 'mastery', 'record', 'badge']),
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  tankId: tankIdSchema.nullable(),
  value: z.number(),
  previous: z.number().nullable(),
  badge: feedBadgeSchema.nullable(),
  at: isoDateTimeSchema
});

export const feedSchema = z.object({ items: z.array(feedItemSchema) });

export const feedQuerySchema = z.object({ days: z.coerce.number().int().min(1).max(60).optional() });

export const leagueQuerySchema = z.object({
  scope: leagueScopeSchema.default('division'),
  metric: leagueMetricSchema.default('damage'),
  week: isoDateSchema.optional()
});

export const leagueEntrySchema = z.object({
  rank: z.number().int().positive(),
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  isMe: z.boolean(),
  battles: countSchema,
  value: z.number().nullable(),
  tier: leagueTierSchema.nullable(),
  zone: leagueZoneSchema.nullable()
});

const leagueDivisionSchema = z.object({
  accountId: accountIdSchema,
  tier: leagueTierSchema,
  group: z.number().int().positive(),
  size: countSchema,
  isClosed: z.boolean(),
  promotionSlots: countSchema,
  relegationSlots: countSchema,
  promotesTo: leagueTierSchema.nullable(),
  relegatesTo: leagueTierSchema.nullable()
});

export const leagueSchema = z.object({
  scope: leagueScopeSchema,
  metric: leagueMetricSchema,
  weekStart: isoDateSchema,
  endsAt: isoDateTimeSchema,
  division: leagueDivisionSchema.nullable(),
  entries: z.array(leagueEntrySchema)
});

const challengeSchema = challengeRuleSchema.extend({
  badgeCode: z.string(),
  progress: z.array(z.object({ accountId: accountIdSchema, value: z.number(), completedAt: isoDateTimeSchema.nullable() }))
});

export const challengesSchema = z.object({
  weekStart: isoDateSchema,
  endsAt: isoDateTimeSchema,
  challenges: z.array(challengeSchema)
});

export const signatureParamsSchema = z.object({
  file: z
    .string()
    .regex(/^\w{2,24}\.png$/i)
    .transform((file) => file.slice(0, -4))
    .pipe(nicknameSchema)
});

export const wrappedParamsSchema = z.object({ id: accountIdSchema });

export const wrappedQuerySchema = z.object({
  year: z.coerce.number().int().min(WRAPPED.minYear).max(2100).optional()
});

export const wrappedSchema = z.object({
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  year: z.number().int(),
  battles: countSchema,
  wins: countSchema,
  winRate: z.number().min(0).max(1).nullable(),
  damageDealt: countSchema,
  avgDamage: z.number().nullable(),
  frags: countSchema,
  topTanks: z.array(z.object({ tankId: tankIdSchema, battles: countSchema, damageDealt: countSchema })),
  marksGained: countSchema,
  masteriesGained: countSchema,
  badges: z.array(z.string()),
  sessions: countSchema,
  busiestMonth: z.number().int().min(1).max(12).nullable(),
  bestBattle: z
    .object({ tankId: tankIdSchema, damageDealt: countSchema, frags: countSchema, at: isoDateTimeSchema, replayId: uuidSchema.nullable() })
    .nullable()
});

export const challengeBadgeContextSchema = z.object({
  times: z.number().int().nonnegative(),
  lastWeek: isoDateSchema.nullable()
});
