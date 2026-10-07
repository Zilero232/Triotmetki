import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '@/shared/api/hud-protocol';

const text = z.nullable(z.string());

export const tankCardThresholdSchema = z.object({ level: z.number(), average: z.string(), reached: z.boolean() });

export const tankCardGoalSchema = z.object({ label: z.string(), value: text, note: text, battles: text });

export const tankCardCellSchema = z.object({ label: z.string(), value: z.string(), note: text, tone: hudToneSchema, color: text });

export const tankCardSectionSchema = z.object({ title: z.string(), cells: z.array(tankCardCellSchema) });

export const tankCardSchema = z.object({
  vehicle: text,
  tier: z.nullable(z.number()),
  class_icon: hudIconSchema,
  marks: z.number(),
  percent: z.nullable(z.number()),
  delta: z.nullable(z.number()),
  points: z.array(z.number()),
  thresholds: z.array(tankCardThresholdSchema),
  goal: z.nullable(tankCardGoalSchema),
  note: text,
  sections: z.array(tankCardSectionSchema)
});
