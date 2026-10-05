import type * as z from 'zod/mini';

import type { gunArcSchema } from './gun-arc.schemas';

export type GunArcData = z.infer<typeof gunArcSchema>;
