import type { VisibleRange, VisibleRangeInput } from './visible-range.types';

export const visibleRange = ({ scrollTop, viewport, rowHeight, count, overscan }: VisibleRangeInput): VisibleRange => {
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const shown = Math.ceil(Math.max(0, viewport) / rowHeight) + 1;
  const start = Math.min(count, Math.max(0, first - overscan));
  const end = Math.min(count, first + shown + overscan);

  return { start, end, total: count * rowHeight };
};
