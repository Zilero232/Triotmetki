import type * as z from 'zod/mini';

import type { crosshairSchema, readoutsSchema } from './crosshair.schemas';

export type CrosshairData = z.infer<typeof crosshairSchema>;
export type CrosshairReadouts = z.infer<typeof readoutsSchema>;
export type ReticleArcsData = NonNullable<CrosshairReadouts['arcs']>;
export type ReloadBoxData = NonNullable<CrosshairReadouts['reload']>;
