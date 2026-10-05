import type { MissionMetric } from '@otmetki/schemas';

import type { MetricCondition, MissionMetricChoice } from './condition-metrics.types';

import { CONDITION_METRIC_RULES } from '../../config/conditions.constants';
import { MISSION_TANKS } from '../../config/suitable-tanks.constants';

export const conditionMetric = (progressId: string): MissionMetric | null =>
  CONDITION_METRIC_RULES.find(([pattern]) => pattern.test(progressId))?.[1] ?? null;

export const missionMetric = (conditions: readonly MetricCondition[]): MissionMetricChoice => {
  const main = conditions.filter((condition) => condition.isMain && !condition.isHeader);

  for (const condition of main) {
    const metric = conditionMetric(condition.progressId);

    if (metric) {
      return { metric, progressId: condition.progressId };
    }
  }

  return { metric: MISSION_TANKS.fallbackMetric, progressId: null };
};
