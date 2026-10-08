import { useEventListener, useWindowEvent } from '@siberiacancode/reactuse';
import { useRef } from 'react';

import { wheelDelta } from '@/shared/lib/wheel-scroll';

import type { ScreenPoint } from '../../../lib/camera-move';
import type { UseOrbitCameraInput } from './use-orbit-camera.types';

import { dragMove, wheelMove } from '../../../lib/camera-move';

export const useOrbitCamera = ({ onMove, onHover, onLeave }: UseOrbitCameraInput) => {
  const lastRef = useRef<ScreenPoint | null>(null);

  const downRef = useEventListener<HTMLDivElement, 'mousedown'>('mousedown', (event) => {
    lastRef.current = { x: event.clientX, y: event.clientY };
    onLeave?.();
  });

  const hoverRef = useEventListener<HTMLDivElement, 'mousemove'>('mousemove', (event) => {
    if (lastRef.current === null) {
      onHover?.({ x: event.clientX, y: event.clientY });
    }
  });

  const leaveRef = useEventListener<HTMLDivElement, 'mouseleave'>('mouseleave', () => {
    onLeave?.();
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
    hoverRef(node);
    leaveRef(node);
    wheelRef(node);
  };
};
