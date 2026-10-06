import * as z from 'zod/mini';

import { hudIconSchema } from '@/shared/api/hud-protocol';

import { CROSSHAIR, RETICLE_MARKS, RETICLE_READOUTS } from '../../config';

const refillSchema = z.object({
  value: z.string(),
  progress: z.nullable(z.number())
});

const clipSchema = z.object({
  style: z.enum(RETICLE_READOUTS.drum.styles),
  size: z.number(),
  loaded: z.number(),
  shell: z.nullable(z.enum(RETICLE_READOUTS.drum.shells)),
  gold: z.boolean(),
  refill: z.nullable(refillSchema)
});

const reloadSchema = z.object({
  value: z.string(),
  full: z.nullable(z.string()),
  state: z.enum(RETICLE_READOUTS.states),
  clip: z.nullable(clipSchema)
});

const arcsSchema = z.object({
  reload: z.nullable(z.number()),
  health: z.nullable(z.number())
});

export const readoutsSchema = z.object({
  reload: z.nullable(reloadSchema),
  arcs: z.nullable(arcsSchema),
  zoom: z.nullable(z.string())
});

export const crosshairSchema = z.object({
  mark: hudIconSchema,
  shape: z.nullable(z.enum(RETICLE_MARKS.shapeIds)),
  color: z.nullable(z.string()),
  outline: z.boolean(),
  size: z.number(),
  hides_centre: z.boolean(),
  sketch: z.boolean(),
  circle: z._default(z.number(), CROSSHAIR.full),
  readouts: z.nullable(readoutsSchema)
});
