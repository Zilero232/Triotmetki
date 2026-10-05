import { describe, expect, it } from 'vitest';

import { formatNumber, formatPercent, formatReload, formatSeconds, formatSigned } from '../format-number';

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
});

describe(formatSeconds, () => {
  it('rounds seconds up the way the client does', () => {
    expect(formatSeconds(12.2)).toBe('13');
  });

  it('writes a minute and more as minutes and seconds', () => {
    expect(formatSeconds(65)).toBe('1:05');
  });
});

describe(formatReload, () => {
  it('writes a reload with one decimal', () => {
    expect(formatReload(3.24)).toBe('3.2');
  });
});
