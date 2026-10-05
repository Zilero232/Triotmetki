import * as z from 'zod/mini';

import { HIT_VIEWER } from '../../config';

const side = z.enum(HIT_VIEWER.sides);
const tone = z.enum(HIT_VIEWER.tones);

const battleSchema = z.object({ id: z.string(), map: z.string(), vehicle: z.string(), date: z.string() });

const rowSchema = z.object({
  n: z.number(),
  index: z.number(),
  vehicle: z.string(),
  class: z.nullable(z.string()),
  result: z.string(),
  part: z.string(),
  tone,
  shell: z.string(),
  damage: z.string(),
  angle: z.string(),
  armor: z.string(),
  nominal: z.string()
});

export const viewerStateSchema = z.object({
  labels: z.record(z.string(), z.string()),
  battles: z.array(battleSchema),
  battle: z.nullable(battleSchema),
  tabs: z.array(z.object({ id: side, label: z.string(), count: z.number() })),
  tab: z.nullable(side),
  rows: z.array(rowSchema),
  selected: z.nullable(z.number()),
  loading: z.optional(z.boolean()),
  approx: z.optional(z.boolean())
});

export const viewerMarksSchema = z.object({
  selected: z.nullable(z.number()),
  marks: z.array(z.object({ i: z.number(), tone, x: z.number(), y: z.number(), tx: z.number(), ty: z.number() }))
});
