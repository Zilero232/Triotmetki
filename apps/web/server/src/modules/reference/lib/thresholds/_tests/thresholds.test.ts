import { describe, expect, it } from 'vitest';

import type { TankThreshold } from '../../../../../../generated';

import { THRESHOLD_SOURCE_PRIORITY } from '../../../config/thresholds.constants';
import { preferredBySource } from '../thresholds';

const row = (tankId: number, source: TankThreshold['source']): Pick<TankThreshold, 'source' | 'tankId'> => ({ tankId, source });

describe('preferredBySource', () => {
  it('keeps one row per tank from the highest-priority source', () => {
    const [first, second] = THRESHOLD_SOURCE_PRIORITY;
    const best = preferredBySource([row(1, second), row(1, first), row(2, second)]);

    expect(best.get(1)?.source).toBe(first);
    expect(best.get(2)?.source).toBe(second);
  });

  it('does not replace a preferred row with a later lower-priority one', () => {
    const best = preferredBySource([row(1, THRESHOLD_SOURCE_PRIORITY[0]), row(1, THRESHOLD_SOURCE_PRIORITY[1])]);

    expect(best.get(1)?.source).toBe(THRESHOLD_SOURCE_PRIORITY[0]);
  });

  it('returns an empty map for no rows', () => {
    expect(preferredBySource([]).size).toBe(0);
  });
});
