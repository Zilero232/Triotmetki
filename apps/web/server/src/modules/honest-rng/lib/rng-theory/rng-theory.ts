import type { RngBucket } from '@otmetki/schemas';

import { HONEST_RNG } from '@otmetki/schemas';
import { errorFunction } from 'simple-statistics';

import type { RngLuck } from '../../honest-rng.types';
import type { LuckInput, NormalCdfInput } from './rng-theory.types';

import { summarizeRolls } from '../../../analytics';
import { RNG_LUCK, RNG_THEORY } from '../../config/theory.constants';

const normalCdf = ({ x, sigma }: NormalCdfInput): number => 0.5 * (1 + errorFunction(x / (sigma * Math.SQRT2)));

export const theoryBuckets = (): RngBucket[] => {
  const sigma = HONEST_RNG.spread * RNG_THEORY.sigmaShare;
  const mass = normalCdf({ x: HONEST_RNG.spread, sigma }) - normalCdf({ x: -HONEST_RNG.spread, sigma });

  return summarizeRolls([]).buckets.map((bucket) => ({
    ...bucket,
    share: ((normalCdf({ x: bucket.to, sigma }) - normalCdf({ x: bucket.from, sigma })) / mass) * 100
  }));
};

export const luckVerdict = ({ meanRoll, shots }: LuckInput): RngLuck => {
  if (meanRoll === null || shots < RNG_LUCK.minShots) {
    return 'unknown';
  }

  if (Math.abs(meanRoll) <= RNG_LUCK.evenBand) {
    return 'even';
  }

  return meanRoll > 0 ? 'lucky' : 'unlucky';
};
