import type { ModGoal } from '@otmetki/schemas';

import type { Goal as GoalRow } from '../../../../generated';
import type { Goal } from '../me.types';
import type { ToModGoalInput } from './goals.types';

import { toIso, toNumber } from '../../../common/lib';

export const toGoal = (row: GoalRow): Goal => ({
  id: row.id,
  accountId: toNumber(row.accountId),
  metric: row.metric,
  tankId: row.tankId,
  target: row.target,
  baseline: row.baseline,
  current: row.current,
  status: row.status,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  achievedAt: toIso(row.achievedAt),
  createdAt: row.createdAt.toISOString()
});

export const toModGoal = ({ row, battles }: ToModGoalInput): ModGoal => ({
  id: row.id,
  metric: row.metric,
  tank_id: row.tankId,
  target: row.target,
  baseline: row.baseline,
  current: row.current,
  battles,
  status: row.status,
  starts_at: row.startsAt.toISOString(),
  ends_at: row.endsAt.toISOString(),
  achieved_at: toIso(row.achievedAt)
});
