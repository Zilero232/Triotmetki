import type { MarkerGeometry, MarkerGeometryInput } from './marker-geometry.types';

import { HIT_VIEWER } from '../../config';

export const markerGeometry = ({ mark, screen }: MarkerGeometryInput): MarkerGeometry => {
  const x = mark.x * screen.width;
  const y = mark.y * screen.height;
  const dx = x - mark.tx * screen.width;
  const dy = y - mark.ty * screen.height;

  return { x, y, length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * HIT_VIEWER.degreesPerRadian };
};
