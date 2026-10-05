import type * as z from 'zod/mini';

import type { platoonPointsSchema } from './platoon-points.schemas';

export type PlatoonPointsData = z.infer<typeof platoonPointsSchema>;
