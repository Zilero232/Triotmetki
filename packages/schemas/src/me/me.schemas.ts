import { z } from 'zod';

import { accountIdSchema, isoDateTimeSchema, tankIdSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { hasGoalTank } from './me';
import { FAVORITE } from './me.constants';

export const favoriteKindSchema = z.enum(['player', 'clan', 'tank']);

export const favoriteSchema = z.object({
  id: uuidSchema,
  kind: favoriteKindSchema,
  targetId: z.number().int().positive(),
  label: z.string().nullable(),
  isOwn: z.boolean(),
  title: z.string().nullable(),
  createdAt: isoDateTimeSchema
});

export const favoritesSchema = z.array(favoriteSchema);

export const createFavoriteSchema = z.object({
  kind: favoriteKindSchema,
  targetId: z.coerce.number().int().positive(),
  label: z.string().trim().max(FAVORITE.labelMaxLength).optional(),
  isOwn: z.boolean().optional()
});

export const goalMetricSchema = z.enum(['winRate', 'wn8', 'avgDamage', 'battles', 'moe', 'broneIndex']);

const goalStatusSchema = z.enum(['active', 'achieved', 'failed', 'cancelled']);

export const goalSchema = z.object({
  id: uuidSchema,
  accountId: accountIdSchema,
  metric: goalMetricSchema.describe('winRate and moe are percents'),
  tankId: tankIdSchema.nullable(),
  target: z.number(),
  baseline: z.number(),
  current: z.number().nullable(),
  status: goalStatusSchema,
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  achievedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema
});

export const goalsSchema = z.array(goalSchema);

export const createGoalFieldsSchema = z.object({
  accountId: accountIdSchema,
  metric: goalMetricSchema,
  tankId: tankIdSchema.optional().describe('Required for a moe goal'),
  target: z.number().finite(),
  endsAt: isoDateTimeSchema
});

export const createGoalSchema = createGoalFieldsSchema.refine(hasGoalTank, { message: 'A moe goal needs a tank', path: ['tankId'] });

export const updateGoalSchema = z.object({
  target: z.number().finite().optional(),
  endsAt: isoDateTimeSchema.optional(),
  status: z.literal('cancelled').optional()
});

export const linkedAccountsSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  lesta: z.array(
    z.object({
      accountId: accountIdSchema,
      nickname: z.string(),
      isPrimary: z.boolean(),
      linkedAt: isoDateTimeSchema,
      tokenExpiresAt: isoDateTimeSchema.nullable(),
      isStale: z.boolean().describe('The Lesta ID token expired or was rejected and could not be renewed; the account has to be linked again')
    })
  ),
  telegram: z.object({ telegramId: z.string(), username: z.string().nullable() }).nullable()
});

export const sessionExtrasSchema = z.object({
  lestaAccountId: accountIdSchema.nullable().catch(null)
});
