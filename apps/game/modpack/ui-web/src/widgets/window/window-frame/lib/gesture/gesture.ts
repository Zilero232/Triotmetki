import type { GestureStep, GestureStepInput, Pointer } from './gesture.types';

import { boundsOf, moveFrame, resizeFrame } from '../frame';

export const pointText = ({ clientX, clientY }: Pointer): string => `${Math.round(clientX)},${Math.round(clientY)} px`;

export const gestureStep = ({ gesture, pointer, viewport }: GestureStepInput): GestureStep => {
  const dx = (pointer.clientX - gesture.startX) / viewport.scale;
  const dy = (pointer.clientY - gesture.startY) / viewport.scale;
  const bounds = boundsOf(viewport);

  const frame =
    gesture.kind === 'move'
      ? moveFrame({ frame: gesture.frame, dx, dy, bounds })
      : resizeFrame({ frame: gesture.frame, dx, dy, edge: gesture.kind, bounds });

  return { frame, dx, dy };
};
