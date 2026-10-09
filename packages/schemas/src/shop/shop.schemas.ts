import * as z from 'zod';

import { countSchema, httpUrlSchema, isoDateTimeSchema, tankIdSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { paginatedSchema, paginationQuerySchema } from '../common/query/query.schemas';

export const bonusCodeStatusSchema = z.enum(['unknown', 'working', 'expired']);
export const bonusCodeVerdictSchema = z.enum(['working', 'expired', 'already_used']);

export const bonusCodeValueSchema = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .regex(/^[\w-]+$/)
  .transform((code) => code.toUpperCase());

export const bonusCodeSchema = z.object({
  code: z.string(),
  title: z.string().nullable(),
  rewards: z.array(z.string()),
  source: z.string(),
  sourceUrl: httpUrlSchema.nullable(),
  status: bonusCodeStatusSchema,
  workingReports: countSchema,
  expiredReports: countSchema,
  discoveredAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema.nullable(),
  lastReportAt: isoDateTimeSchema.nullable()
});

export const bonusCodeReportSchema = z.object({
  code: bonusCodeValueSchema,
  verdict: bonusCodeVerdictSchema
});

export const premiumOfferSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  url: httpUrlSchema.nullable(),
  image: z.url().nullable(),
  tankIds: z.array(tankIdSchema),
  priceRub: z.number().nonnegative().nullable(),
  priceGold: countSchema.nullable(),
  discountPercent: z.number().int().min(0).max(100).nullable(),
  startsAt: isoDateTimeSchema.nullable(),
  endsAt: isoDateTimeSchema.nullable(),
  firstSeenAt: isoDateTimeSchema,
  timesSeen: z.number().int().positive()
});

export const gameEventKindSchema = z.enum([
  'event',
  'sale',
  'marathon',
  'battle_pass',
  'front_line',
  'onslaught',
  'ranked',
  'personal_missions',
  'drops',
  'other'
]);

export const gameEventSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  kind: gameEventKindSchema,
  title: z.string(),
  description: z.string().nullable(),
  url: httpUrlSchema.nullable(),
  image: z.url().nullable(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullable()
});

export const gameEventsQuerySchema = z.object({
  kind: gameEventKindSchema.optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional()
});

const newsKindSchema = z.enum(['news', 'patch_notes', 'dev_blog']);

export const newsQuerySchema = paginationQuerySchema.extend({
  kind: newsKindSchema.optional(),
  tankId: tankIdSchema.optional()
});

export const newsItemSchema = z.object({
  id: uuidSchema,
  source: z.string(),
  url: httpUrlSchema,
  kind: newsKindSchema,
  title: z.string(),
  summary: z.string().nullable(),
  image: z.string().nullable(),
  tankIds: z.array(tankIdSchema),
  gameVersion: z.string().nullable(),
  publishedAt: isoDateTimeSchema
});

export const newsPageSchema = paginatedSchema(newsItemSchema);
