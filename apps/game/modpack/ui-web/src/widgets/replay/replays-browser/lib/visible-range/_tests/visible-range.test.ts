import { describe, expect, it } from 'vitest';

import type { VisibleRangeInput } from '../visible-range.types';

import { visibleRange } from '../visible-range';

const ROW = 68;

const longList = (overrides: Partial<VisibleRangeInput> = {}): VisibleRangeInput => ({
  scrollTop: 0,
  viewport: ROW * 5,
  rowHeight: ROW,
  count: 1000,
  overscan: 3,
  ...overrides
});

describe(visibleRange, () => {
  it('draws the rows in view plus the overscan on both sides', () => {
    expect(visibleRange(longList({ scrollTop: ROW * 100 }))).toEqual({ start: 97, end: 109, total: 68_000 });
  });

  it('starts at the first row at the top of the list', () => {
    expect(visibleRange(longList({ scrollTop: 0 })).start).toBe(0);
  });

  it('ends at the last row at the bottom of the list', () => {
    expect(visibleRange(longList({ scrollTop: ROW * 999 })).end).toBe(1000);
  });

  it('stays inside a short list scrolled past its top', () => {
    const range = visibleRange(longList({ scrollTop: -40, viewport: ROW, count: 2 }));

    expect(range).toEqual({ start: 0, end: 2, total: 136 });
  });

  it('draws nothing for an empty list', () => {
    expect(visibleRange(longList({ scrollTop: 500, viewport: 300, count: 0 }))).toEqual({ start: 0, end: 0, total: 0 });
  });
});
