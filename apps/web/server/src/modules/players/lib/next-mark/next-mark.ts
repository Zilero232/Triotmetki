import { MOE } from '@otmetki/ratings';

import type { CombinedSourceInput, NextMark, NextMarkInput, ThresholdForInput } from './next-mark.types';

const [, twoMarks, threeMarks] = MOE.markPercents;

const thresholdFor = ({ thresholds, percent }: ThresholdForInput): number => {
  if (percent >= threeMarks) {
    return thresholds.p95;
  }

  return percent >= twoMarks ? thresholds.p85 : thresholds.p65;
};

export const nextMark = ({ percent, marksOnGun, thresholds, movingDamage }: NextMarkInput): NextMark => {
  const reached = percent === null ? (marksOnGun ?? 0) : MOE.markPercents.filter((mark) => percent >= mark).length;
  const target = MOE.markPercents[reached];

  if (target === undefined) {
    return { percent: null, damage: null };
  }

  if (!thresholds || movingDamage === null) {
    return { percent: target, damage: null };
  }

  return { percent: target, damage: Math.max(0, thresholdFor({ thresholds, percent: target }) - movingDamage) };
};

export const combinedSource = ({ fromBattles, fromRating }: CombinedSourceInput): 'battles' | 'damage' | null => {
  if (fromBattles !== undefined) {
    return 'battles';
  }

  return fromRating === undefined ? null : 'damage';
};
