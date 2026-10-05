import type { z } from 'zod';

import type {
  createFavoriteSchema,
  createGoalFieldsSchema,
  createGoalSchema,
  favoriteKindSchema,
  favoriteSchema,
  goalMetricSchema,
  goalSchema,
  linkedAccountsSchema,
  sessionExtrasSchema,
  updateGoalSchema
} from './me.schemas';

export type FavoriteKind = z.infer<typeof favoriteKindSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;
export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;
export type GoalMetric = z.infer<typeof goalMetricSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type GoalTankInput = Pick<z.infer<typeof createGoalFieldsSchema>, 'metric' | 'tankId'>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type LinkedAccounts = z.infer<typeof linkedAccountsSchema>;
export type SessionExtras = z.infer<typeof sessionExtrasSchema>;
