import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '@/shared/api/hud-protocol';

import { TEAM_HP } from '../../config';

const side = z.object({ hp: z.number(), max: z.number(), alive: z.number(), count: z.number(), frags: z.number() });

const vehicle = z.object({ icon: hudIconSchema, tier: z.nullable(z.string()), hp: z.number(), max: z.number(), alive: z.boolean() });

export const teamHpSchema = z.object({
  style: z.enum(TEAM_HP.styles),
  allies: side,
  enemies: side,
  show_score: z.boolean(),
  score_alive: z.boolean(),
  diff: z.nullable(z.number()),
  tones: z.object({ ally: hudToneSchema, enemy: hudToneSchema }),
  colors: z.object({ ally: z.nullable(z.string()), enemy: z.nullable(z.string()) }),
  vehicles: z.object({ allies: z.array(vehicle), enemies: z.array(vehicle) })
});
