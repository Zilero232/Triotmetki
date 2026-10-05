import * as z from 'zod/mini';

import { hudIconSchema } from '@/shared/api/hud-protocol';

export const sixthSenseSchema = z.object({
  icon: hudIconSchema,
  size: z.number(),
  text: z.string(),
  color: z.nullable(z.string()),
  elapsed: z.number(),
  duration: z.number(),
  timer: z.boolean(),
  dim: z.boolean()
});
