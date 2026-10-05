import type { RngBucket, RngDistance, ShotRoll } from '@otmetki/schemas';

import { HONEST_RNG } from '@otmetki/schemas';
import { clamp, countBy, range, sumBy } from 'remeda';

import type { StoredShot } from '../stored-shots/stored-shots.types';
import type { RollSummary } from './rolls.types';

import { percentOf } from '../../../../common/lib';
import { HONEST_RNG_WINDOW } from '../../config/battle-review.constants';

const excluded: readonly string[] = HONEST_RNG_WINDOW.excludedShells;

export const shotRolls = (shots: readonly StoredShot[]): ShotRoll[] =>
  shots.flatMap((shot) => {
    if (shot.outcome !== 'damage' || shot.fatal || shot.nominal === null || excluded.includes(shot.shell)) {
      return [];
    }

    const ratio = shot.damage / shot.nominal;

    return ratio >= HONEST_RNG_WINDOW.minRatio && ratio <= HONEST_RNG_WINDOW.maxRatio ? [{ damage: shot.damage, nominal: shot.nominal, ratio }] : [];
  });

const rollBuckets = (rolls: readonly ShotRoll[]): RngBucket[] => {
  const width = (HONEST_RNG.spread * 2) / HONEST_RNG.buckets;
  const indexOf = (roll: ShotRoll): number =>
    clamp(Math.floor((roll.ratio - 1 + HONEST_RNG.spread) / width), { min: 0, max: HONEST_RNG.buckets - 1 });

  const counts = countBy(rolls, (roll) => String(indexOf(roll)));

  return range(0, HONEST_RNG.buckets).map((index) => {
    const count = counts[String(index)] ?? 0;
    const from = -HONEST_RNG.spread + index * width;

    return { from, to: from + width, shots: count, share: percentOf({ value: count, by: rolls.length }) };
  });
};

const distanceBuckets = (shots: readonly StoredShot[]): RngDistance[] => {
  const measured = shots.filter((shot) => shot.distance !== null && shot.outcome !== 'miss');
  const edges = HONEST_RNG_WINDOW.distanceEdges;

  if (measured.length === 0) {
    return [];
  }

  return edges.map((from, index) => {
    const to = edges[index + 1] ?? null;
    const inside = measured.filter((shot) => (shot.distance ?? 0) >= from && (to === null || (shot.distance ?? 0) < to));
    const pierced = inside.filter((shot) => shot.outcome === 'damage').length;

    return { from, to, shots: inside.length, pierced, penRate: percentOf({ value: pierced, by: inside.length }) };
  });
};

export const summarizeRolls = (shots: readonly StoredShot[]): RollSummary => {
  const rolls = shotRolls(shots);
  const nominal = sumBy(rolls, (roll) => roll.nominal);
  const within = rolls.filter((roll) => Math.abs(roll.ratio - 1) <= HONEST_RNG.spread + Number.EPSILON).length;

  return {
    shots: rolls.length,
    meanRoll: nominal > 0 ? sumBy(rolls, (roll) => roll.damage) / nominal - 1 : null,
    withinSpread: percentOf({ value: within, by: rolls.length }),
    buckets: rollBuckets(rolls),
    distance: distanceBuckets(shots)
  };
};
