import * as z from 'zod/mini';

import { hudIconSchema } from '@/shared/api/hud-protocol';

const row = z.object({
  name: z.string(),
  own: z.boolean(),
  points: z.number(),
  damage: z.nullable(z.number()),
  assist: z.nullable(z.number()),
  frags: z.number(),
  frags_text: z.string(),
  hp: z.number(),
  max: z.number(),
  alive: z.boolean(),
  cls: hudIconSchema
});

export const platoonPointsSchema = z.object({
  title: z.string(),
  rows: z.array(row),
  total: z.number(),
  rules: z.object({ damage: z.number(), assist: z.number(), frag: z.number(), alive: z.number() }),
  extended: z.boolean()
});
