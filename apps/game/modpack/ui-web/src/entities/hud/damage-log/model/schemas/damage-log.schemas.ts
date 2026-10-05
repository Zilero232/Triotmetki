import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '@/shared/api/hud-protocol';

const total = z.object({ key: z.string(), icon: hudIconSchema, value: z.number(), tone: hudToneSchema });

const shell = z.object({ code: z.string(), label: z.string(), gold: z.boolean() });

const row = z.object({
  id: z.string(),
  amount: z.nullable(z.number()),
  tone: hudToneSchema,
  icon: hudIconSchema,
  shell: z.nullable(shell),
  cls: hudIconSchema,
  name: z.string(),
  hits: z.number(),
  hp: z.nullable(z.number()),
  max: z.nullable(z.number()),
  ammo_rack: hudIconSchema,
  note: z.string()
});

export const damageLogSchema = z.object({
  wide: z.boolean(),
  totals: z.array(total),
  dealt: z.array(row),
  received: z.array(row)
});
