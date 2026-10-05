import type { RoundToInput } from './round.types';

export const roundTo = ({ value, digits }: RoundToInput): number => {
  const scale = 10 ** digits;

  return Math.round(value * scale) / scale;
};
