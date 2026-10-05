import type { z } from 'zod';

import type { playerComparisonSchema, tankComparisonSchema } from './compare.schemas';

export type PlayerComparison = z.infer<typeof playerComparisonSchema>;
export type TankComparison = z.infer<typeof tankComparisonSchema>;
