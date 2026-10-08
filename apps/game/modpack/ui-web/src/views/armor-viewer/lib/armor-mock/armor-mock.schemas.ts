import * as z from 'zod/mini';

import { armorModeSchema } from '@/entities/armor/armor-map';

export const mockMessageSchema = z.object({
  command: z.string(),
  mode: z.optional(armorModeSchema)
});
