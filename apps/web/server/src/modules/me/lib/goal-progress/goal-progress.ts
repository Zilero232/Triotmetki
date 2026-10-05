import type { TankTotals } from '@otmetki/ratings';

import { accountWn8, computeAverages, sumTotals } from '@otmetki/ratings';
import { groupBy, sumBy } from 'remeda';
import { match } from 'ts-pattern';

import type { GoalMetric } from '../../../../../generated';
import type { GoalCurrentInput, GoalOutcome, GoalOutcomeInput, WindowTotalsInput } from './goal-progress.types';

import { GOAL_PROGRESS } from '../../config/goal-progress.constants';

const WINDOW_METRICS: ReadonlySet<GoalMetric> = new Set(GOAL_PROGRESS.windowMetrics);

const RESOLVED_AT_END: ReadonlySet<GoalMetric> = new Set(GOAL_PROGRESS.resolvedAtEndMetrics);

export const isWindowMetric = (metric: GoalMetric): boolean => WINDOW_METRICS.has(metric);

export const mergeTankTotals = (rows: readonly TankTotals[]): TankTotals[] =>
  Object.values(groupBy(rows, (row) => String(row.tankId))).map((group) => ({ ...sumTotals(group), tankId: group[0].tankId }));

export const windowTotals = ({ mod, api }: WindowTotalsInput): TankTotals[] => {
  const battlesOf = (rows: readonly TankTotals[]) => sumBy(rows, (row) => row.battles);

  return mergeTankTotals(battlesOf(mod) >= battlesOf(api) ? mod : api);
};

export const goalCurrent = ({ metric, tanks, expected, level }: GoalCurrentInput): number | null => {
  if (!isWindowMetric(metric)) {
    return level;
  }

  const totals = sumTotals(tanks);

  if (totals.battles === 0) {
    return null;
  }

  return match(metric)
    .with('battles', () => totals.battles)
    .with('winRate', () => computeAverages(totals).winRate)
    .with('avgDamage', () => computeAverages(totals).damage)
    .otherwise(() => accountWn8({ tanks, expected }).wn8);
};

export const goalOutcome = ({ metric, current, target, hasEnded }: GoalOutcomeInput): GoalOutcome => {
  const isReached = current !== null && current >= target;

  if (isReached && (hasEnded || !RESOLVED_AT_END.has(metric))) {
    return 'achieved';
  }

  return hasEnded ? 'failed' : null;
};
