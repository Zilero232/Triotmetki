import type * as z from 'zod/mini';

import type { tankCardCellSchema, tankCardGoalSchema, tankCardSchema, tankCardSectionSchema, tankCardThresholdSchema } from './tank-card.schemas';

export type TankCardData = z.infer<typeof tankCardSchema>;
export type TankCardThreshold = z.infer<typeof tankCardThresholdSchema>;
export type TankCardGoal = z.infer<typeof tankCardGoalSchema>;
export type TankCardCell = z.infer<typeof tankCardCellSchema>;
export type TankCardSection = z.infer<typeof tankCardSectionSchema>;
