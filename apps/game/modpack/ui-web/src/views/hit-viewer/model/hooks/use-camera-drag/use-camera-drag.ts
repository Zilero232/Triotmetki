import { useEventListener, useWindowEvent } from '@siberiacancode/reactuse';
import { useRef } from 'react';

import { wheelDelta } from '@/shared/lib/wheel-scroll';

import type { CameraMove, ScreenPoint } from '../../../lib/camera-move';

import { dragMove, wheelMove } from '../../../lib/camera-move';

export const useCameraDrag = (onMove: (move: CameraMove) => void) => {
  const lastRef = useRef<ScreenPoint | null>(null);

  const downRef = useEventListener<HTMLDivElement, 'mousedown'>('mousedown', (event) => {
    lastRef.current = { x: event.clientX, y: event.clientY };
  });

  const wheelRef = useEventListener<HTMLDivElement, 'wheel'>(
    'wheel',
    (event) => {
      event.preventDefault();

      const move = wheelMove(wheelDelta(event));

      if (move) {
        onMove(move);
      }
    },
    { passive: false }
  );

  useWindowEvent('mousemove', (event) => {
    const from = lastRef.current;

    if (!from) {
      return;
    }

    const to = { x: event.clientX, y: event.clientY };
    const move = dragMove({ from, to });

    lastRef.current = to;

    if (move) {
      onMove(move);
    }
  });

  useWindowEvent('mouseup', () => {
    lastRef.current = null;
  });

  return (node: HTMLDivElement) => {
    downRef(node);
    wheelRef(node);
  };
};
