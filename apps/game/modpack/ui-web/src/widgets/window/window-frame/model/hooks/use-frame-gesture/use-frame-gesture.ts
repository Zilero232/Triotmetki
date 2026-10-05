import { useRef } from 'react';

import { reportOnce } from '@/shared/lib/page-diag';

import type { Gesture } from '../../../lib/gesture';
import type { Handles, UseFrameGestureInput } from './use-frame-gesture.types';

import { FRAME_GESTURE } from '../../../config';
import { describeFrame } from '../../../lib/describe';
import { gestureStep, pointText } from '../../../lib/gesture';
import { gestureAt } from '../../../lib/hit';
import { usePageMouse } from '../use-page-mouse';

export const useFrameGesture = ({ frame, viewport, onChange, onDone }: UseFrameGestureInput): Handles => {
  const moveRef = useRef<HTMLDivElement>(null);
  const cornerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const handles: Handles = { move: moveRef, corner: cornerRef, right: rightRef, bottom: bottomRef };

  const onPress = (event: MouseEvent): void => {
    if (event.button > 0) {
      return;
    }

    const targets = FRAME_GESTURE.handleOrder.map((kind) => ({ kind, rect: handles[kind].current?.getBoundingClientRect() ?? null }));
    const kind = gestureAt({ targets, x: event.clientX, y: event.clientY });

    reportOnce({ kind: 'mousedown', text: `${pointText(event)} on ${kind ?? 'content'}` });

    if (kind) {
      event.preventDefault();
      gestureRef.current = { kind, startX: event.clientX, startY: event.clientY, frame, last: frame };
    }
  };

  const onMove = (event: MouseEvent): void => {
    const gesture = gestureRef.current;

    if (!gesture) {
      return;
    }

    const step = gestureStep({ gesture, pointer: event, viewport });

    gesture.last = step.frame;
    reportOnce({ kind: 'mousemove', text: `${gesture.kind} by ${Math.round(step.dx)},${Math.round(step.dy)} rem` });
    onChange(gesture.last);
  };

  const onRelease = (event: MouseEvent): void => {
    const gesture = gestureRef.current;

    if (gesture) {
      gestureRef.current = null;
      reportOnce({ kind: 'mouseup', text: `${pointText(event)}, frame ${describeFrame(gesture.last)}` });
      onDone(gesture.last);
    }
  };

  usePageMouse({ onPress, onMove, onRelease });

  return handles;
};
