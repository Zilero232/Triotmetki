import { clamp } from 'remeda';

import type { DistanceAtInput, FractionOfInput } from './distance-scale.types';

export const distanceAt = ({ fraction, limits, step }: DistanceAtInput): number => {
  const [min, max] = limits;
  const raw = min + clamp(fraction, { min: 0, max: 1 }) * (max - min);

  return clamp(Math.round(raw / step) * step, { min, max });
};

export const fractionOf = ({ value, limits }: FractionOfInput): number => {
  const [min, max] = limits;

  if (max <= min) {
    return 0;
  }

  return clamp((value - min) / (max - min), { min: 0, max: 1 });
};
