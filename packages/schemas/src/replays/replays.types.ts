import type { z } from 'zod';

import type { replayPlayerSchema, replaySummarySchema, replayTagSchema } from './replays.schemas';

export type ReplayPlayer = z.infer<typeof replayPlayerSchema>;
export type ReplaySummary = z.infer<typeof replaySummarySchema>;
export type ReplayTag = z.infer<typeof replayTagSchema>;
