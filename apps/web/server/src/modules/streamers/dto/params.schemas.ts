import { streamerSlugSchema, uuidSchema } from '@otmetki/schemas';
import { z } from 'zod';

export const slugParamsSchema = z.object({
  slug: streamerSlugSchema
});

export const idParamsSchema = z.object({
  id: uuidSchema
});
