import * as z from 'zod/mini';

import { hudIconSchema } from '@/shared/api/hud-protocol';

import { RETICLE_MARKS, RETICLE_READOUTS } from '../../config';

const reloadSchema = z.object({
  value: z.string(),
  full: z.nullable(z.string()),
  state: z.enum(RETICLE_READOUTS.states),
  clip: z.nullable(z.object({ size: z.number(), loaded: z.number() }))
});

const arcsSchema = z.object({
  reload: z.nullable(z.number()),
  health: z.nullable(z.number())
});

export const readoutsSchema = z.object({
  reload: z.nullable(reloadSchema),
  arcs: z.nullable(arcsSchema)
});

export const crosshairSchema = z.object({
  mark: hudIconSchema,
  shape: z.nullable(z.enum(RETICLE_MARKS.shapeIds)),
  color: z.nullable(z.string()),
  outline: z.boolean(),
  size: z.number(),
  hides_centre: z.boolean(),
  sketch: z.boolean(),
  readouts: z.nullable(readoutsSchema)
});
