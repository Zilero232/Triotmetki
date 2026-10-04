import type { ArcPathInput } from './reticle-arcs.types';

import { RETICLE_READOUTS } from '../../config';

const SIDE_DEGREES = { left: 180, right: 0 } as const;

const num = (value: number): string => String(Math.round(value * 100) / 100);

const point = (centre: number, degrees: number): string => {
  const radians = (degrees * Math.PI) / 180;
  const { radius } = RETICLE_READOUTS.arcs;

  return `${num(centre + radius * Math.cos(radians))} ${num(centre + radius * Math.sin(radians))}`;
};

export const arcPath = ({ side, progress, centre }: ArcPathInput): string | null => {
  const filled = Math.max(0, Math.min(1, progress));

  if (filled <= 0) {
    return null;
  }

  const { radius, span } = RETICLE_READOUTS.arcs;
  const bottom = side === 'left' ? SIDE_DEGREES.left - span / 2 : SIDE_DEGREES.right + span / 2;
  const sweep = side === 'left' ? 1 : 0;
  const end = side === 'left' ? bottom + span * filled : bottom - span * filled;

  return `M${point(centre, bottom)}A${radius} ${radius} 0 0 ${sweep} ${point(centre, end)}`;
};
