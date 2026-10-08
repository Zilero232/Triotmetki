import * as z from 'zod/mini';

import { armorLegendSchema, armorMapSchema, armorModeSchema, armorReadoutSchema } from '@/entities/armor/armor-map';
import { hudToneSchema } from '@/shared/api/hud-protocol';

const tankRowSchema = z.object({
  cd: z.number(),
  name: z.string(),
  tier: z.nullable(z.number()),
  class: z.nullable(z.string()),
  own: z.boolean(),
  active: z.boolean()
});

const moduleRowSchema = z.object({ cd: z.number(), label: z.string(), active: z.boolean() });

const attackerSchema = z.object({ cd: z.number(), name: z.string(), tier: z.nullable(z.number()), is_target: z.boolean() });

export const armorStateSchema = z.object({
  labels: z.record(z.string(), z.string()),
  tank: z.nullable(tankRowSchema),
  mode: armorModeSchema,
  modes: z.array(z.object({ id: armorModeSchema, label: z.string(), active: z.boolean() })),
  garage: z.array(tankRowSchema),
  query: z.string(),
  matches: z.array(tankRowSchema),
  modules: z.object({ turrets: z.array(moduleRowSchema), guns: z.array(moduleRowSchema) }),
  attacker: z.nullable(attackerSchema),
  attackers: z.array(tankRowSchema),
  shells: z.array(z.object({ label: z.string(), active: z.boolean() })),
  distance: z.number(),
  distance_limits: z.tuple([z.number(), z.number()]),
  legend: armorLegendSchema,
  cameras: z.array(z.object({ id: z.string(), label: z.string() }))
});

export const armorStatusSchema = z.object({ text: z.string(), tone: hudToneSchema, progress: z.nullable(z.number()) });

export const armorMapStateSchema = z.nullable(armorMapSchema);

export const armorHoverSchema = z.nullable(armorReadoutSchema);
