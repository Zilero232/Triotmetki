import type * as z from 'zod/mini';

import type { battleClockSchema } from './battle-clock.schemas';

export type BattleClockData = z.infer<typeof battleClockSchema>;
