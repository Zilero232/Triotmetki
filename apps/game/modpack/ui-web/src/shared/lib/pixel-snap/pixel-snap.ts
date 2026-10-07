import { round } from 'remeda';

import type { PixelSnapInput } from './pixel-snap.types';

import { PIXEL_SNAP } from './pixel-snap.constants';

const usableRatio = (ratio: number): number => (Number.isFinite(ratio) && ratio > 0 ? ratio : 1);

export const snapToDevice = ({ value, ratio }: PixelSnapInput): number => {
  const scale = usableRatio(ratio);

  return round(Math.round(value * scale) / scale, PIXEL_SNAP.digits);
};
