import * as z from 'zod/mini';

import { HIT_VIEWER } from '../../config';

export const mockMessageSchema = z.object({
  command: z.string(),
  index: z.optional(z.number()),
  tab: z.optional(z.enum(HIT_VIEWER.sides))
});
