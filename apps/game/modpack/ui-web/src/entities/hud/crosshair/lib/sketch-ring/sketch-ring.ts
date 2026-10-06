import type { SketchRing } from './sketch-ring.types';

import { CROSSHAIR } from '../../config';

const percent = (value: number): string => `${String(value)}%`;

export const sketchRing = (circle: number): SketchRing => {
  const share = (CROSSHAIR.ring * circle) / CROSSHAIR.full;
  const offset = (CROSSHAIR.full - share) / 2;

  return { top: percent(offset), left: percent(offset), width: percent(share), height: percent(share) };
};
