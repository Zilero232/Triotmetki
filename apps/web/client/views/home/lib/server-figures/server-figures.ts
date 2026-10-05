import type { ActivityStaleInput, ServerFiguresInput, ServerFiguresState } from './server-figures.types';

import { HOME } from '../../config';

const isPositive = (value: number | null) => value !== null && value > 0;

export const serverFiguresState = ({ isPending, isError, trackedPlayers, online }: ServerFiguresInput): ServerFiguresState => {
  if (isError) {
    return 'error';
  }

  if (isPending) {
    return 'pending';
  }

  return isPositive(trackedPlayers) || isPositive(online) ? 'ready' : 'empty';
};

export const isActivityStale = ({ activePlayers, lastActiveAt, now }: ActivityStaleInput): boolean => {
  if (!isPositive(activePlayers) || lastActiveAt === null) {
    return true;
  }

  return now !== null && now.getTime() - new Date(lastActiveAt).getTime() > HOME.activityStaleMs;
};
