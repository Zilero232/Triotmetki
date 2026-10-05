import type * as z from 'zod/mini';

import type { aimArmorSchema } from './aim-armor.schemas';

export type AimArmorData = z.infer<typeof aimArmorSchema>;
