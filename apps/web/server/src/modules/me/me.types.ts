import type { ExpectedValuesTable } from '@otmetki/ratings';
import type {
  CreateFavoriteInput as CreateFavoriteBody,
  CreateGoalInput as CreateGoalBody,
  Favorite,
  Goal,
  LinkedAccounts,
  ModGoals,
  NotificationSettings,
  UpdateGoalInput as UpdateGoalBody
} from '@otmetki/schemas';

import type { Goal as GoalRow } from '../../../generated';
import type { GoalWindow } from './lib/goal/goal.types';

export type { Favorite, Goal, LinkedAccounts, ModGoals };

export type CreateFavoriteInput = CreateFavoriteBody & { userId: string };
export type CreateGoalInput = CreateGoalBody & { userId: string };
export type UpdateGoalInput = UpdateGoalBody & { userId: string; id: string };

export type OwnedInput = {
  userId: string;
  id: string;
};

export type AccountLinkInput = {
  userId: string;
  accountId: number;
};

export type UpdateNotificationsInput = Partial<NotificationSettings> & {
  userId: string;
};

export type BaselineInput = Pick<GoalRow, 'accountId' | 'metric' | 'tankId'>;

export type HangarGoalsInput = {
  userId: string;
  accountId: bigint;
  now?: Date;
};

export type GoalBattlesQueryInput = {
  accountId: bigint;
  tankId: number | null;
  window: GoalWindow;
};

export type GoalAtInput = {
  goal: GoalRow;
  now: Date;
};

export type EvaluateGoalInput = GoalAtInput & {
  expected: ExpectedValuesTable;
};
