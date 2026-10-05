import { addDays, min, subHours } from 'date-fns';

import type { GoalBattlesInput, GoalEndInput, GoalWindow, GoalWindowInput } from './goal.types';

import { GOALS, MOD_GOALS } from '../../config/me.constants';

export const isGoalEndAllowed = ({ endsAt, now }: GoalEndInput): boolean => endsAt > now && endsAt <= addDays(now, GOALS.maxDurationDays);

export const hangarGoalsSince = (now: Date): Date => subHours(now, MOD_GOALS.endedWithinHours);

export const goalWindow = ({ startsAt, endsAt, now }: GoalWindowInput): GoalWindow => ({ from: startsAt, to: min([endsAt, now]) });

export const goalBattles = ({ modBattles, apiBattles }: GoalBattlesInput): number => Math.max(0, modBattles, apiBattles ?? 0);
