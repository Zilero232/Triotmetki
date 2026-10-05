import type * as z from 'zod/mini';

import type { gunArcPointSchema, gunArcSchema } from './gun-arc.schemas';

export type GunArcData = z.infer<typeof gunArcSchema>;

export type GunArcPoint = z.infer<typeof gunArcPointSchema>;
