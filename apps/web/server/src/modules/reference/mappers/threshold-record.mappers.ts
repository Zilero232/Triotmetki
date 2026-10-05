import type { TankThreshold } from '../../../../generated';
import type { MasteryLevels, MasteryThresholdRecord, MoeLevels, MoeThresholdRecord, ThresholdLevels } from '../reference.types';

import { THRESHOLD_LEVELS } from '../config/thresholds.constants';

const { moe: MOE, mastery: MASTERY } = THRESHOLD_LEVELS;

const toBase = ({ tankId, date, source, sampleSize, capturedAt }: TankThreshold) => ({ tankId, date, source, sampleSize, capturedAt });

export const toMoeThresholdRecord = (row: TankThreshold): MoeThresholdRecord => ({
  ...toBase(row),
  p65: row[MOE.p65],
  p85: row[MOE.p85],
  p95: row[MOE.p95],
  p100: row[MOE.p100]
});

export const toMasteryThresholdRecord = (row: TankThreshold): MasteryThresholdRecord | null => {
  const master = row[MASTERY.master];

  if (master === null) {
    return null;
  }

  return { ...toBase(row), class3: row[MASTERY.class3], class2: row[MASTERY.class2], class1: row[MASTERY.class1], master };
};

export const moeThresholdLevels = (levels: MoeLevels): ThresholdLevels => ({
  [MOE.p65]: levels.p65,
  [MOE.p85]: levels.p85,
  [MOE.p95]: levels.p95,
  [MOE.p100]: levels.p100
});

export const masteryThresholdLevels = (levels: MasteryLevels): ThresholdLevels => ({
  [MASTERY.class3]: levels.class3,
  [MASTERY.class2]: levels.class2,
  [MASTERY.class1]: levels.class1,
  [MASTERY.master]: levels.master
});
