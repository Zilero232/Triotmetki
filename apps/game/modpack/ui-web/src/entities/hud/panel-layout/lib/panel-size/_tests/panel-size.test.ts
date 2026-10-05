import { describe, expect, it } from 'vitest';

import { stickySize, wheelScale } from '../panel-size';

const size = ({ lines = 1, width, height }: { lines?: number; width: number; height: number }) => ({ lines, width, height });

describe(stickySize, () => {
  it('keeps the wider previous size while the line count stays', () => {
    const previous = size({ width: 120, height: 20 });

    expect(stickySize({ previous, next: size({ width: 110, height: 20 }) })).toEqual(previous);
  });

  it('takes the larger of each side while the line count stays', () => {
    const previous = size({ width: 120, height: 20 });

    expect(stickySize({ previous, next: size({ width: 130, height: 18 }) })).toEqual({ lines: 1, width: 130, height: 20 });
  });

  it('takes the new size when the text gets another line count', () => {
    const previous = size({ width: 300, height: 20 });

    expect(stickySize({ previous, next: size({ lines: 2, width: 90, height: 40 }) })).toEqual({ lines: 2, width: 90, height: 40 });
  });

  it('takes the first measured size as it is', () => {
    expect(stickySize({ previous: undefined, next: size({ width: 5, height: 5 }) })).toEqual({ lines: 1, width: 5, height: 5 });
  });
});

describe(wheelScale, () => {
  it.each([
    { name: 'grows on wheel up', current: 1, deltaY: -100, expected: 1.1 },
    { name: 'shrinks on wheel down', current: 1, deltaY: 100, expected: 0.9 },
    { name: 'stops at the largest scale', current: 3, deltaY: -100, expected: 3 },
    { name: 'stops at the smallest scale', current: 0.5, deltaY: 100, expected: 0.5 },
    { name: 'keeps the scale on a sideways turn with no vertical delta', current: 1, deltaY: 0, expected: 1 }
  ])('$name', ({ current, deltaY, expected }) => {
    expect(wheelScale({ current, deltaY })).toBe(expected);
  });
});
