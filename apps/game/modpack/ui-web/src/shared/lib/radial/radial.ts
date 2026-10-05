import { clamp } from 'remeda';

import type { RadialArcInput } from './radial.types';

const TURN = 2 * Math.PI;

const point = (value: number): string => String(Number(value.toFixed(2)));

export const radialArc = ({ progress, radius, centre }: RadialArcInput): string => {
  const done = clamp(progress, { min: 0, max: 1 });
  const arc = `A${point(radius)} ${point(radius)} 0`;
  const top = `${point(centre)} ${point(centre - radius)}`;

  if (done <= 0) {
    return '';
  }

  if (done >= 1) {
    return `M${top}${arc} 1 1 ${point(centre)} ${point(centre + radius)}${arc} 1 1 ${top}`;
  }

  const angle = done * TURN;
  const end = `${point(centre + radius * Math.sin(angle))} ${point(centre - radius * Math.cos(angle))}`;

  return `M${top}${arc} ${done > 0.5 ? 1 : 0} 1 ${end}`;
};
