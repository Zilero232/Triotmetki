import type * as z from 'zod/mini';

import type { battleSummarySchema } from './battle-summary.schemas';

export type BattleSummaryData = z.infer<typeof battleSummarySchema>;
