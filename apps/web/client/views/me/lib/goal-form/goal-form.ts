import type { GoalMetric } from '@otmetki/schemas';

import { createGoalFieldsSchema, hasGoalTank, isGoalTankMetric } from '@otmetki/schemas';
import { addDays } from 'date-fns';
import * as z from 'zod';

import type { ToGoalInputInput } from './goal-form.types';

import { GOAL_FORM, GOAL_METRICS } from '../../config';

export const isPercentMetric = (metric: GoalMetric) => GOAL_METRICS.percent.has(metric);

export const goalFormSchema = createGoalFieldsSchema
  .pick({ metric: true, tankId: true })
  .extend({ target: z.coerce.number().positive(), duration: z.enum(GOAL_FORM.durations) })
  .refine(({ metric, target }) => !isPercentMetric(metric) || target <= GOAL_METRICS.percentMax, { path: ['target'] })
  .refine(hasGoalTank, { path: ['tankId'] });

export const toGoalInput = ({ values: { metric, tankId, target, duration }, accountId, now }: ToGoalInputInput) => ({
  accountId,
  metric,
  ...(isGoalTankMetric(metric) && tankId !== undefined ? { tankId } : {}),
  target,
  endsAt: addDays(now, Number(duration)).toISOString()
});
