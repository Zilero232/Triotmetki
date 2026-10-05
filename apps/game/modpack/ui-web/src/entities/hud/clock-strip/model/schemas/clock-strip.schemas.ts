import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '@/shared/api/hud-protocol';

export const clockStripSchema = z.object({
  icon: hudIconSchema,
  time: z.string(),
  date: z.string(),
  server: z.string(),
  ping_icon: hudIconSchema,
  ping: z.string(),
  ping_tone: hudToneSchema,
  online_label: z.string(),
  online: z.string()
});
