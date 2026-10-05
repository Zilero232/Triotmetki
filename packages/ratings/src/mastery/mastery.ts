import { fromKeys, mapValues } from 'remeda';

import type { MasteryLevel, MasteryThresholds } from './mastery.types';

import { MASTERY_BADGES, MASTERY_LEVELS, MASTERY_PERCENTILES } from './mastery.constants';

export const masteryLevel = (markOfMastery: number): MasteryLevel => MASTERY_LEVELS[markOfMastery] ?? 'none';

export const masteryThresholds = (distribution: Readonly<Record<string, number>>): MasteryThresholds | null => {
  const thresholds = mapValues(MASTERY_PERCENTILES, (percentile) => distribution[String(percentile)]);

  return MASTERY_BADGES.every((badge) => thresholds[badge] !== undefined) ? fromKeys(MASTERY_BADGES, (badge) => thresholds[badge] ?? 0) : null;
};
