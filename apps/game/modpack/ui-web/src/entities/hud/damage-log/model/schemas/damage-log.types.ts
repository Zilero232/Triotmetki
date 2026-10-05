import type * as z from 'zod/mini';

import type { damageLogSchema } from './damage-log.schemas';

export type DamageLogData = z.infer<typeof damageLogSchema>;
export type DamageLogRow = DamageLogData['dealt'][number];
export type DamageLogTotal = DamageLogData['totals'][number];
