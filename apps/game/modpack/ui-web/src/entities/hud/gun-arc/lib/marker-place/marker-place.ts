import type { GunArcPoint } from '../../model/schemas';
import type { MarkerPlace } from './marker-place.types';

import { GUN_ARC } from '../../config';

const { canvas, box } = GUN_ARC;

export const markerPlace = ({ x, y }: GunArcPoint): MarkerPlace => ({
  left: Math.round(canvas.width / 2 + x - box.width / 2),
  top: Math.round(canvas.height / 2 + y - box.height / 2)
});
