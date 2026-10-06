import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatNumber,
  formatPercent,
  formatPercentOrDash,
  formatSeconds,
  formatSigned,
  groupDigits,
  romanTier,
  trendOf
} from '../format-number';

describe(formatNumber, () => {
  it.each([
    [6812, '6 812'],
    [-1200, '-1 200'],
    [0, '0']
  ])('groups the thousands of %d with a thin no-break space', (value, text) => {
    expect(formatNumber(value)).toBe(text);
  });

  it('writes the number just under 100 000 in full', () => {
    expect(formatNumber(99_999)).toBe('99 999');
  });

  it('abbreviates from 100 000', () => {
    expect(formatNumber(128_400)).toBe('128 k');
  });
});

describe(formatSigned, () => {
  it.each([
    [238, '+238'],
    [-1200, '-1 200']
  ])('signs the delta %d', (value, text) => {
    expect(formatSigned(value)).toBe(text);
  });

  it('leaves a zero delta unsigned', () => {
    expect(formatSigned(0)).toBe('0');
  });
});

describe(formatPercent, () => {
  it('writes percent with a decimal comma', () => {
    expect(formatPercent({ value: 87.344, digits: 2 })).toBe('87,34 %');
  });

  it.each([
    [0.42, '+0,42 %'],
    [-0.5, '-0,50 %']
  ])('signs %s when asked', (value, text) => {
    expect(formatPercent({ value, digits: 2, signed: true })).toBe(text);
  });

  it('leaves the unit out when asked', () => {
    expect(formatPercent({ value: 0.42, digits: 2, signed: true, unit: false })).toBe('+0,42');
  });
});

describe(formatPercentOrDash, () => {
  it('writes a dash for an unknown percent', () => {
    expect(formatPercentOrDash({ value: null, digits: 2 })).toBe('—');
  });

  it('writes a known percent', () => {
    expect(formatPercentOrDash({ value: 87.344, digits: 2 })).toBe('87,34 %');
  });
});

describe(groupDigits, () => {
  it('rounds and groups the thousands without shortening', () => {
    expect(groupDigits(1234567.4)).toBe('1 234 567');
  });
});

describe(formatClock, () => {
  it('always writes minutes and seconds', () => {
    expect(formatClock(42.4)).toBe('0:42');
  });

  it('rounds to the nearest second', () => {
    expect(formatClock(125.6)).toBe('2:06');
  });
});

describe(romanTier, () => {
  it('writes a tier in Roman numerals', () => {
    expect(romanTier(8)).toBe('VIII');
  });

  it('writes nothing for a tier out of range', () => {
    expect(romanTier(12)).toBeNull();
  });
});

describe(trendOf, () => {
  it.each([
    [0.3, 'rising'],
    [-0.3, 'falling'],
    [0, 'flat'],
    [null, 'flat']
  ])('reads %s as %s', (delta, trend) => {
    expect(trendOf(delta)).toBe(trend);
  });
});

describe(formatSeconds, () => {
  it('rounds seconds up the way the client does', () => {
    expect(formatSeconds(12.2)).toBe('13');
  });

  it('writes a minute and more as minutes and seconds', () => {
    expect(formatSeconds(65)).toBe('1:05');
  });
});
