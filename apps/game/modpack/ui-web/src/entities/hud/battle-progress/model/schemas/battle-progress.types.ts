import type * as z from 'zod/mini';

import type { battleProgressSchema } from './battle-progress.schemas';

export type BattleProgressData = z.infer<typeof battleProgressSchema>;

export type MainGunData = NonNullable<BattleProgressData['main_gun']>;

export type Wn8Data = NonNullable<BattleProgressData['wn8']>;
