import { rngBucketSchema } from '@otmetki/schemas';
import { z } from 'zod';

import type { RngSummary } from '../honest-rng.types';
import type { RngAggregateRow } from './rng-view.types';

const bucketsSchema = z.array(rngBucketSchema).catch([]);

export const toRngSummary = (row: RngAggregateRow): RngSummary => ({
  battles: row.battles,
  players: row.players,
  shots: row.shots,
  meanRoll: row.meanRoll,
  withinSpread: row.withinSpread,
  buckets: bucketsSchema.parse(row.buckets),
  hitRate: row.hitRate,
  penRate: row.penRate
});
