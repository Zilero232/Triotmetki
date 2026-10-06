import { describe, expect, it } from 'vitest';

import { NUMBER_FORMAT } from '@/shared/lib/format-number';

import { formatCount, formatDuration, formatSize } from '../format-replay';

describe(formatCount, () => {
  it('groups thousands', () => {
    expect(formatCount(1234567)).toBe('1 234 567');
  });

  it('writes zero as a number', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('shows a dash for an unknown value', () => {
    expect(formatCount(null)).toBe(NUMBER_FORMAT.dash);
  });
});

describe(formatDuration, () => {
  it.each([
    { seconds: 402, expected: '6:42' },
    { seconds: 59, expected: '0:59' }
  ])('writes $seconds seconds as $expected', ({ seconds, expected }) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('shows a dash for an unknown duration', () => {
    expect(formatDuration(null)).toBe(NUMBER_FORMAT.dash);
  });
});

describe(formatSize, () => {
  it('writes megabytes with one decimal', () => {
    expect(formatSize(2.25 * 1024 * 1024)).toBe('2.3');
  });
});
