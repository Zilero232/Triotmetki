import type { LearningBucket, LearningDifficulty } from '@otmetki/schemas';

import { LEARNING_CURVE } from '@otmetki/schemas';
import { last } from 'remeda';

import { clampPercentDelta } from '../../../../common/lib';
import { TANK_LEARNING } from '../../config/tank-traits.constants';

export const bucketOf = (battles: number): number => {
  const index = LEARNING_CURVE.bucketStarts.findLastIndex((start) => battles >= start);

  return Math.max(index, 0);
};

export const learningDifficulty = (gain: number | null): LearningDifficulty | null => {
  if (gain === null) {
    return null;
  }

  const { easy, moderate, hard } = TANK_LEARNING.difficultyGain;

  if (gain < easy) {
    return 'easy';
  }

  if (gain < moderate) {
    return 'moderate';
  }

  return gain < hard ? 'hard' : 'hardcore';
};

export const learningGain = (buckets: readonly LearningBucket[]): number | null => {
  const eligible = buckets.filter((bucket) => bucket.battles >= TANK_LEARNING.minBucketBattles && bucket.winRate !== null);
  const first = eligible.at(0);
  const final = last(eligible);

  if (!first || !final || first === final || first.winRate === null || final.winRate === null) {
    return null;
  }

  return clampPercentDelta(final.winRate - first.winRate);
};
