import { describe, expect, it } from 'vitest';

import { THRESHOLD_DROP } from '../../../config/watchers.constants';
import { thresholdDrops } from '../threshold-drops';

const previous = { p65: 2000, p85: 3000, p95: 4000 };

describe('thresholdDrops', () => {
  it('reports each mark whose threshold fell by more than the tolerance', () => {
    const drops = thresholdDrops({ previous, current: { p65: 1900, p85: 3000, p95: 3500 }, minDropPercent: THRESHOLD_DROP.minDropPercent });

    expect(drops).toEqual([
      { mark: 1, from: 2000, to: 1900 },
      { mark: 3, from: 4000, to: 3500 }
    ]);
  });

  it('ignores a drop exactly at the tolerance', () => {
    const current = { ...previous, p95: previous.p95 * (1 - THRESHOLD_DROP.minDropPercent / 100) };

    expect(thresholdDrops({ previous, current, minDropPercent: THRESHOLD_DROP.minDropPercent })).toEqual([]);
  });

  it('ignores a rising threshold', () => {
    expect(thresholdDrops({ previous, current: { p65: 2100, p85: 3100, p95: 4100 }, minDropPercent: 0 })).toEqual([]);
  });

  it('skips a mark with no previous value', () => {
    expect(thresholdDrops({ previous: { ...previous, p65: 0 }, current: { ...previous, p65: 0 }, minDropPercent: 0 })).toEqual([]);
  });
});
