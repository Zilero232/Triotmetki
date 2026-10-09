import { RATING_TIERS } from '@otmetki/ratings';
import * as z from 'zod';

import { countSchema, percentSchema } from '../primitives/primitives.schemas';

export const ratingTierSchema = z.enum(RATING_TIERS);

export const ratingKindSchema = z.enum(['wn8', 'eff', 'broneIndex', 'winRate', 'avgDamage']);

export const ratingValueSchema = z.object({
  value: z.number().nullable(),
  tier: ratingTierSchema.nullable()
});

export const statsBlockSchema = z.object({
  battles: countSchema,
  winRate: percentSchema.nullable(),
  avgDamage: z.number().nonnegative().nullable(),
  avgFrags: z.number().nonnegative().nullable(),
  avgSpotted: z.number().nonnegative().nullable(),
  avgXp: z.number().nonnegative().nullable(),
  avgBlocked: z.number().nonnegative().nullable(),
  avgAssisted: z.number().nonnegative().nullable(),
  survivalRate: percentSchema.nullable(),
  accuracy: percentSchema.nullable(),
  avgTier: z.number().min(1).max(11).nullable(),
  wn8: ratingValueSchema,
  eff: ratingValueSchema,
  broneIndex: ratingValueSchema
});
