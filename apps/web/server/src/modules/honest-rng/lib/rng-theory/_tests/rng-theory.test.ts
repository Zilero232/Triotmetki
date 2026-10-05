import { HONEST_RNG } from '@otmetki/schemas';
import { sumBy } from 'remeda';
import { describe, expect, it } from 'vitest';

import { RNG_LUCK } from '../../../config/theory.constants';
import { luckVerdict, theoryBuckets } from '../rng-theory';

describe('theoryBuckets', () => {
  const buckets = theoryBuckets();

  it('covers the spread with shares that add up to the whole', () => {
    expect(buckets).toHaveLength(HONEST_RNG.buckets);
    expect(sumBy(buckets, (bucket) => bucket.share ?? 0)).toBeCloseTo(100, 4);
  });

  it('is symmetric and peaks at the nominal damage', () => {
    const shares = buckets.map((bucket) => bucket.share ?? 0);

    shares.forEach((share, index) => expect(share).toBeCloseTo(shares.at(-1 - index) ?? Number.NaN, 4));
    expect(shares[0]).toBeLessThan(shares[Math.floor(shares.length / 2)] ?? 0);
  });
});

describe('luckVerdict', () => {
  it('stays unknown below the minimum sample', () => {
    expect(luckVerdict({ meanRoll: 0.2, shots: RNG_LUCK.minShots - 1 })).toBe('unknown');
    expect(luckVerdict({ meanRoll: null, shots: RNG_LUCK.minShots })).toBe('unknown');
  });

  it('calls a mean inside the band even and signs the rest', () => {
    expect(luckVerdict({ meanRoll: RNG_LUCK.evenBand, shots: RNG_LUCK.minShots })).toBe('even');
    expect(luckVerdict({ meanRoll: RNG_LUCK.evenBand * 2, shots: RNG_LUCK.minShots })).toBe('lucky');
    expect(luckVerdict({ meanRoll: -RNG_LUCK.evenBand * 2, shots: RNG_LUCK.minShots })).toBe('unlucky');
  });
});
