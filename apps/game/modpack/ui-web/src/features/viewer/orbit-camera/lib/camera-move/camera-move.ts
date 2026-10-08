import type { CameraMove, DragMoveInput } from './camera-move.types';

import { ORBIT_CAMERA } from '../../config';

export const dragMove = ({ from, to }: DragMoveInput): CameraMove | null => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return dx === 0 && dy === 0 ? null : { dx, dy, dz: 0 };
};

export const wheelMove = (delta: number): CameraMove | null => (delta === 0 ? null : { dx: 0, dy: 0, dz: -Math.sign(delta) * ORBIT_CAMERA.zoomStep });
