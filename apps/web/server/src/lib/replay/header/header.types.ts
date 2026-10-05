import type { z } from 'zod';

import type { arenaBlockSchema, personalResultSchema, resultsBlockSchema, vehicleResultSchema } from './header.schemas';

export type ArenaBlock = z.infer<typeof arenaBlockSchema>;
export type PersonalResult = z.infer<typeof personalResultSchema>;
export type ResultsBlock = z.infer<typeof resultsBlockSchema>;
export type VehicleResult = z.infer<typeof vehicleResultSchema>;
