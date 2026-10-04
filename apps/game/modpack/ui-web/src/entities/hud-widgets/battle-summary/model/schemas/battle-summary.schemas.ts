import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '../../../../../shared/api/hud-protocol';

const tile = z.object({
  icon: hudIconSchema,
  label: z.string(),
  value: z.string(),
  tone: hudToneSchema
});

const row = z.object({
  icon: hudIconSchema,
  text: z.string(),
  value: z.string(),
  note: z.nullable(z.string()),
  tone: hudToneSchema,
  progress: z.nullable(z.number()),
  progress_tone: hudToneSchema
});

export const battleSummarySchema = z.object({
  title: z.string(),
  subtitle: z.nullable(z.string()),
  result: z.nullable(z.string()),
  result_tone: hudToneSchema,
  tiles: z.array(tile),
  rows: z.array(row),
  dismiss: z.nullable(z.object({ id: z.string(), label: z.string() }))
});
