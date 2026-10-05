import * as z from 'zod/mini';

import { hudIconSchema } from '@/shared/api/hud-protocol';

export const equipmentItemSchema = z.object({
  icon: hudIconSchema,
  overlay: hudIconSchema,
  name: z.string(),
  effect: z.string(),
  kind: z.enum(['device', 'directive']),
  empty: z.boolean(),
  bonus: z.boolean(),
  boosted: z.boolean(),
  attention: z.boolean(),
  active: z.boolean(),
  used: z.boolean()
});

export const battleLoadoutSchema = z.object({ size: z.number(), cell: z.number(), gap: z.number(), items: z.array(equipmentItemSchema) });
