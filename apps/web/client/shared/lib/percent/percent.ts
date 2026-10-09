import type { PercentTextInput, UnitSuffixInput } from './percent.types';

import { PERCENT_TEXT } from './percent.constants';

export const percentText = ({ format, value, digits = PERCENT_TEXT.digits }: PercentTextInput): string =>
  value === null || value === undefined
    ? PERCENT_TEXT.empty
    : format.number(value / PERCENT_TEXT.scale, { style: 'percent', maximumFractionDigits: digits });

export const percentSign = (locale: string): string => {
  const parts = new Intl.NumberFormat(locale, { style: 'percent' }).formatToParts(0);
  const affix = parts.filter((part) => part.type !== 'integer');

  return affix.map((part) => part.value).join('');
};

export const unitSuffix = ({ suffix, locale }: UnitSuffixInput): string | undefined => (suffix === PERCENT_TEXT.sign ? percentSign(locale) : suffix);
