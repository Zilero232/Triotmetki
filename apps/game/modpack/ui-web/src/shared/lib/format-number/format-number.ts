import type { FormatPercentInput, PercentSignInput } from './format-number.types';

import { NUMBER_FORMAT } from './format-number.constants';

const groups = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, NUMBER_FORMAT.thinSpace);

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

export const formatPercent = ({ value, digits, signed = false }: FormatPercentInput): string => {
  const fixed = Math.abs(value).toFixed(digits).replace('.', NUMBER_FORMAT.decimalComma);
  const rounded = Number(Math.abs(value).toFixed(digits));
  const sign = percentSign({ value, rounded, signed });

  return `${sign}${fixed}${NUMBER_FORMAT.thinSpace}%`;
};

export const formatSeconds = (seconds: number): string => {
  const whole = Math.max(0, Math.ceil(seconds));

  if (whole < NUMBER_FORMAT.secondsPerMinute) {
    return String(whole);
  }

  const minutes = Math.floor(whole / NUMBER_FORMAT.secondsPerMinute);
  const rest = whole % NUMBER_FORMAT.secondsPerMinute;

  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

export const formatReload = (seconds: number): string => Math.max(0, seconds).toFixed(1);
