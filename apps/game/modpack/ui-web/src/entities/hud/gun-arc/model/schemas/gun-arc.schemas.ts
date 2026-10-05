import * as z from 'zod/mini';

import { GUN_ARC } from '../../config';

export const gunArcPointSchema = z.object({ x: z.number(), y: z.number() });

export const gunArcSchema = z.object({
  marker: z.enum(GUN_ARC.markers),
  centre_marker: z.enum(GUN_ARC.centreMarkers),
  left: z.nullable(gunArcPointSchema),
  right: z.nullable(gunArcPointSchema),
  centre: z.nullable(gunArcPointSchema)
});
