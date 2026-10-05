import { accountIdSchema, isoDateTimeSchema, paginatedSchema, paginationQuerySchema, tankIdSchema, uuidSchema } from '@otmetki/schemas';
import { z } from 'zod';

import { playerStatsSchema, postStatusSchema } from '../../community-core';
import { PLATOON } from '../config/platoons.constants';

export const platoonPostSchema = z.object({
  id: uuidSchema,
  accountId: accountIdSchema,
  nickname: z.string().nullable(),
  tiers: z.array(z.number().int().min(1).max(11)),
  modes: z.array(z.string()),
  tankIds: z.array(tankIdSchema),
  hasVoice: z.boolean(),
  minWn8: z.number().int().nullable(),
  message: z.string().nullable(),
  status: postStatusSchema,
  stats: playerStatsSchema.nullable(),
  availableFrom: isoDateTimeSchema.nullable(),
  availableUntil: isoDateTimeSchema.nullable(),
  expiresAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema
});

export const platoonQuerySchema = paginationQuerySchema.extend({
  tier: z.coerce.number().int().min(1).max(11).optional(),
  mode: z.string().trim().min(1).max(32).optional(),
  hasVoice: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  minWn8: z.coerce.number().int().min(0).optional(),
  maxWn8: z.coerce.number().int().min(0).optional(),
  availableAt: isoDateTimeSchema.optional()
});

export const platoonPageSchema = paginatedSchema(platoonPostSchema);

export const createPlatoonSchema = z.object({
  accountId: accountIdSchema.optional(),
  tiers: z.array(z.number().int().min(1).max(11)).max(11).default([]),
  modes: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
  tankIds: z.array(tankIdSchema).max(20).default([]),
  hasVoice: z.boolean().default(false),
  minWn8: z.number().int().min(0).max(10_000).optional(),
  message: z.string().trim().max(500).optional(),
  availableFrom: isoDateTimeSchema.optional(),
  availableUntil: isoDateTimeSchema.optional(),
  expiresInHours: z.number().int().min(1).max(PLATOON.maxHours).default(PLATOON.defaultHours)
});
