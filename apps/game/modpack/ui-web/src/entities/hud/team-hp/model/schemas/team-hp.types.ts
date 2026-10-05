import type * as z from 'zod/mini';

import type { teamHpSchema } from './team-hp.schemas';

export type TeamHpData = z.infer<typeof teamHpSchema>;
export type TeamHpSide = TeamHpData['allies'];
export type TeamHpVehicle = TeamHpData['vehicles']['allies'][number];
