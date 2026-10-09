import * as z from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';

export const followKindSchema = z.enum(['player', 'clan', 'tank']);

export const followSchema = z.object({
  id: uuidSchema,
  kind: followKindSchema,
  targetId: z.number().int().positive(),
  label: z.string().nullable(),
  createdAt: isoDateTimeSchema
});

export const followListSchema = z.array(followSchema);

export const createFollowSchema = z.object({
  kind: followKindSchema,
  targetId: z.number().int().positive()
});

export const followParamsSchema = z.object({ id: uuidSchema });
