import { clamp, round } from 'remeda';

import type { CirclePathInput, PolarPointInput, RadialArcInput } from './radial.types';

import { RADIAL } from './radial.constants';

export const pathNumber = (value: number): string => String(round(value, RADIAL.digits));

export const polarPoint = ({ centre, radius, degrees }: PolarPointInput): string => {
  const radians = (degrees * Math.PI) / 180;
  const x = centre + radius * Math.cos(radians);
  const y = centre + radius * Math.sin(radians);

  return `${pathNumber(x)} ${pathNumber(y)}`;
};

export const circlePath = ({ centre, radius }: CirclePathInput): string => {
  const start = `M${pathNumber(centre - radius)} ${pathNumber(centre)}`;
  const half = `a${pathNumber(radius)} ${pathNumber(radius)} 0 1 0`;

  return `${start}${half} ${pathNumber(2 * radius)} 0${half} ${pathNumber(-2 * radius)} 0z`;
};

export const radialArc = ({ progress, radius, centre }: RadialArcInput): string => {
  const done = clamp(progress, { min: 0, max: 1 });
  const arc = `A${pathNumber(radius)} ${pathNumber(radius)} 0`;
  const top = `${pathNumber(centre)} ${pathNumber(centre - radius)}`;

  if (done <= 0) {
    return '';
  }

  if (done >= 1) {
    return `M${top}${arc} 1 1 ${pathNumber(centre)} ${pathNumber(centre + radius)}${arc} 1 1 ${top}`;
  }

  const angle = done * RADIAL.turn;
  const end = `${pathNumber(centre + radius * Math.sin(angle))} ${pathNumber(centre - radius * Math.cos(angle))}`;
  const largeArc = done > 0.5 ? 1 : 0;

  return `M${top}${arc} ${largeArc} 1 ${end}`;
};
