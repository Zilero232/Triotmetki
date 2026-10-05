import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '@/shared/api/hud-protocol';

const levelNeedSchema = z.object({ level: z.number(), need: z.number() });

export const marksPanelSchema = z.object({
  style: z.enum(['compact', 'silhouette', 'extended', 'minimal', 'custom']),
  look: z.optional(z.enum(['box', 'silhouette'])),
  stars: z.optional(z.number()),
  silhouette: z.optional(z.nullable(z.string())),
  next: z.optional(z.nullable(z.object({ level: z.number(), need: z.nullable(z.number()) }))),
  damage: z.optional(z.nullable(z.object({ label: z.string(), value: z.number(), target: z.number() }))),
  has_curve: z.boolean(),
  percent: z.nullable(z.number()),
  delta: z.nullable(z.number()),
  estimated: z.boolean(),
  mark: hudIconSchema,
  tone: hudToneSchema,
  goal: z.nullable(levelNeedSchema),
  note: z.nullable(z.string()),
  text: z.nullable(z.string()),
  thresholds: z.array(z.object({ level: z.number(), need: z.number(), reached: z.boolean() })),
  step: z.nullable(z.object({ step: z.number(), need: z.number() })),
  average: z.nullable(z.object({ label: z.string(), ema: z.number(), ema_projected: z.number() })),
  battles: z.nullable(z.object({ level: z.number(), text: z.string() }))
});
