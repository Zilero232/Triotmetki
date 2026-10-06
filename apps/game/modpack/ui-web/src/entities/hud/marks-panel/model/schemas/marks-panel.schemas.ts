import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '@/shared/api/hud-protocol';

import { MARKS_PANEL } from '../../config';

const levelNeedSchema = z.object({ level: z.number(), need: z.number() });

export const marksPanelSchema = z.object({
  style: z.enum(MARKS_PANEL.styles),
  stars: z.optional(z.number()),
  damage: z.optional(z.nullable(z.object({ label: z.string(), value: z.number(), target: z.number() }))),
  has_curve: z.boolean(),
  percent: z.nullable(z.number()),
  delta: z.nullable(z.number()),
  estimated: z.boolean(),
  mark: hudIconSchema,
  tone: hudToneSchema,
  goal: z.nullable(levelNeedSchema),
  bar: z.optional(z.nullable(z.object({ value: z.number(), hold: z.number(), end: z.number() }))),
  to: z.optional(z.string()),
  note: z.nullable(z.string()),
  text: z.nullable(z.string()),
  thresholds: z.array(z.object({ level: z.number(), need: z.number(), reached: z.boolean() })),
  step: z.nullable(z.object({ step: z.number(), need: z.number() })),
  average: z.nullable(z.object({ label: z.string(), ema: z.number(), ema_projected: z.number() }))
});
