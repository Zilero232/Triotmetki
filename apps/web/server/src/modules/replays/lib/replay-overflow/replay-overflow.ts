import { addDays, subDays } from 'date-fns';
import { drop, map, pipe, sortBy } from 'remeda';

import type { OverflowPlan, OverflowPlanInput, OverflowReplayIdsInput } from './replay-overflow.types';

import { REPLAY_OVERFLOW } from '../../config/overflow.constants';

export const overflowPlan = ({ accessEndedAt, now }: OverflowPlanInput): OverflowPlan => {
  const deleteAt = addDays(accessEndedAt, REPLAY_OVERFLOW.readOnlyDays);

  if (now >= deleteAt) {
    return { kind: 'delete', deleteAt };
  }

  const daysLeft = REPLAY_OVERFLOW.noticeDays.find((days) => now >= subDays(deleteAt, days));

  return daysLeft === undefined ? { kind: 'wait', deleteAt } : { kind: 'notice', deleteAt, daysLeft };
};

export const overflowReplayIds = ({ replays, keep }: OverflowReplayIdsInput): string[] =>
  pipe(
    replays,
    sortBy([(replay) => replay.createdAt.getTime(), 'desc'], [(replay) => replay.id, 'desc']),
    drop(keep),
    map((replay) => replay.id)
  );
