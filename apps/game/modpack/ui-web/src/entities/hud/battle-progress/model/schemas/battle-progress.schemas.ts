import * as z from 'zod/mini';

import { hudIconSchema } from '@/shared/api/hud-protocol';

const mainGun = z.object({
  title: z.string(),
  icon: hudIconSchema,
  reached_icon: hudIconSchema,
  status: z.enum(['progress', 'reached']),
  damage: z.number(),
  need: z.number(),
  left: z.number(),
  left_caption: z.string(),
  reached_text: z.string(),
  progress: z.nullable(z.number()),
  detail: z.nullable(z.string())
});

const wn8 = z.object({
  icon: hudIconSchema,
  label: z.string(),
  value: z.string(),
  color: z.nullable(z.string()),
  note: z.nullable(z.string())
});

export const battleProgressSchema = z.object({
  main_gun: z.nullable(mainGun),
  wn8: z.nullable(wn8)
});
