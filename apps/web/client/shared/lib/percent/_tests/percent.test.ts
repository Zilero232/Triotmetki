import { describe, expect, it } from 'vitest';

import type { PercentFormatter } from '../percent.types';

import { percentSign, percentText, unitSuffix } from '../percent';
import { PERCENT_TEXT } from '../percent.constants';

const formatter = (locale: string): PercentFormatter => ({
  number: (value, options) =>
    new Intl.NumberFormat(locale, {
      style: typeof options === 'object' ? options.style : undefined,
      maximumFractionDigits: typeof options === 'object' ? options.maximumFractionDigits : undefined
    }).format(value)
});

describe('percentText', () => {
  it('prints a 0–100 rate as a percent without scaling a small value up', () => {
    expect(percentText({ format: formatter('en'), value: 0.5 })).toBe('0.5%');
    expect(percentText({ format: formatter('en'), value: 56.34 })).toBe('56.3%');
  });

  it('follows the locale spacing and decimal comma', () => {
    expect(percentText({ format: formatter('ru'), value: 54.21, digits: 2 })).toBe('54,21 %');
  });

  it('prints the placeholder for a missing rate', () => {
    expect(percentText({ format: formatter('en'), value: null })).toBe(PERCENT_TEXT.empty);
  });
});

describe('percentSign', () => {
  it('puts a no-break space before the sign in Russian', () => {
    expect(percentSign('ru')).toBe(`${String.fromCharCode(160)}%`);
  });

  it('glues the sign to the number in English', () => {
    expect(percentSign('en')).toBe('%');
  });
});

describe('unitSuffix', () => {
  it('localizes the percent sign', () => {
    expect(unitSuffix({ suffix: '%', locale: 'ru' })).toBe(`${String.fromCharCode(160)}%`);
  });

  it('keeps any other suffix as is', () => {
    expect(unitSuffix({ suffix: ' pp', locale: 'ru' })).toBe(' pp');
  });
});
