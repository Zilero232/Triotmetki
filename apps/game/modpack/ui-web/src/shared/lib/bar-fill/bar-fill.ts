import { clamp, round } from 'remeda';

import type { BarFillInput, BarShiftStyle } from './bar-fill.types';

import { BAR_FILL } from './bar-fill.constants';

export const barFill = ({ value, max, width }: BarFillInput): number => (max > 0 ? Math.round(clamp(value / max, { min: 0, max: 1 }) * width) : 0);

export const fillScaleStyle = (share: number): BarShiftStyle => {
  const filled = Number.isFinite(share) ? clamp(share, { min: 0, max: 1 }) : 0;

  return { transform: `scaleX(${String(round(filled, BAR_FILL.digits))})` };
};

export const slideStyle = (percent: number): BarShiftStyle => {
  const shift = clamp(percent, { min: 0, max: 100 });

  return { transform: `translateX(${String(round(shift, BAR_FILL.digits))}%)` };
};
