import type { PlayerMarks } from '@otmetki/schemas';

import type { ToPlayerMarkInput } from './player-marks.types';

import { clampPercent, toIso } from '../../../common/lib';
import { combinedSource, nextMark } from '../lib/next-mark/next-mark';
import { clampMastery } from '../lib/tank-marks/tank-marks';

export const toPlayerMark = ({ tank, vehicle, threshold, fromBattles, fromRating }: ToPlayerMarkInput): PlayerMarks['items'][number] => {
  const thresholds = threshold ? { p65: threshold.p65, p85: threshold.p85, p95: threshold.p95, p100: threshold.p100 } : null;
  const moePercent = clampPercent(tank.moePercent);
  const target = nextMark({ percent: moePercent, marksOnGun: tank.marksOnGun, thresholds, movingDamage: tank.moeMovingDamage });

  return {
    vehicle,
    battles: tank.battles,
    marksOnGun: tank.marksOnGun,
    markOfMastery: clampMastery(tank.markOfMastery),
    moePercent,
    movingDamage: tank.moeMovingDamage,
    avgCombinedDamage: fromBattles ?? fromRating ?? null,
    combinedDamageSource: combinedSource({ fromBattles, fromRating }),
    thresholds,
    nextMarkPercent: target.percent,
    damageToNextMark: target.damage,
    updatedAt: toIso(tank.moeUpdatedAt ?? tank.updatedAt)
  };
};
