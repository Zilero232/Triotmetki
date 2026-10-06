import type { FormatPercentInput, OptionalPercentInput, PercentSignInput, Trend } from './format-number.types';

import { NUMBER_FORMAT } from './format-number.constants';

const groups = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, NUMBER_FORMAT.thinSpace);

export const groupDigits = (value: number): string => groups(String(Math.round(value)));

export const formatNumber = (value: number): string => {
  const whole = Math.round(Math.abs(value));
  const sign = value < 0 && whole > 0 ? NUMBER_FORMAT.minus : '';

  if (whole >= NUMBER_FORMAT.kiloFrom) {
    return `${sign}${groups(String(Math.round(whole / 1000)))}${NUMBER_FORMAT.thinSpace}${NUMBER_FORMAT.kiloSuffix}`;
  }

  return `${sign}${groups(String(whole))}`;
};

export const formatSigned = (value: number): string => (value > 0 ? `${NUMBER_FORMAT.plus}${formatNumber(value)}` : formatNumber(value));

const percentSign = ({ value, rounded, signed }: PercentSignInput): string => {
  if (rounded === 0) {
    return '';
  }

  if (value < 0) {
    return NUMBER_FORMAT.minus;
  }

  return signed ? NUMBER_FORMAT.plus : '';
};

export const formatPercent = ({ value, digits, signed = false, unit = true }: FormatPercentInput): string => {
  const fixed = Math.abs(value).toFixed(digits).replace('.', NUMBER_FORMAT.decimalComma);
  const rounded = Number(Math.abs(value).toFixed(digits));
  const sign = percentSign({ value, rounded, signed });
  const suffix = unit ? `${NUMBER_FORMAT.thinSpace}${NUMBER_FORMAT.percent}` : '';

  return `${sign}${fixed}${suffix}`;
};

export const formatPercentOrDash = ({ value, digits }: OptionalPercentInput): string =>
  value === null ? NUMBER_FORMAT.dash : formatPercent({ value, digits });

const clockText = (whole: number): string => {
  const minutes = Math.floor(whole / NUMBER_FORMAT.secondsPerMinute);
  const rest = whole % NUMBER_FORMAT.secondsPerMinute;

  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

export const formatClock = (seconds: number): string => clockText(Math.max(0, Math.round(seconds)));

export const formatSeconds = (seconds: number): string => {
  const whole = Math.max(0, Math.ceil(seconds));

  return whole < NUMBER_FORMAT.secondsPerMinute ? String(whole) : clockText(whole);
};

export const romanTier = (tier: number | null): string | null => (tier === null ? null : (NUMBER_FORMAT.romanTiers[tier - 1] ?? null));

export const trendOf = (delta: number | null): Trend => {
  const change = delta ?? 0;

  if (change > 0) {
    return 'rising';
  }

  return change < 0 ? 'falling' : 'flat';
};
