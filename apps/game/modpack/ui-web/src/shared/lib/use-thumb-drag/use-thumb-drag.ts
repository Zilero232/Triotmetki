import { useEventListener, useWindowEvent } from '@siberiacancode/reactuse';
import { useRef } from 'react';

import { SCROLL_AREA } from '@/shared/config';
import { scrollMetricsOf } from '@/shared/lib/scroll-metrics';
import { thumbOf, topFromThumb } from '@/shared/lib/wheel-scroll';

import type { DragOfInput, ThumbDrag, UseThumbDragInput } from './use-thumb-drag.types';

const dragOf = ({ element, clientY }: DragOfInput): ThumbDrag => {
  const { height } = element.getBoundingClientRect();
  const { offset } = thumbOf({ ...scrollMetricsOf(element), minThumb: SCROLL_AREA.minThumb });
  const factor = element.offsetHeight > 0 ? height / element.offsetHeight : 1;

  return { startY: clientY, startOffset: offset, factor };
};

export const useThumbDrag = ({ viewportRef, visible, onDragged }: UseThumbDragInput) => {
  const dragRef = useRef<ThumbDrag | null>(null);

  const thumbRef = useEventListener<HTMLDivElement, 'mousedown'>(
    'mousedown',
    (event) => {
      const element = viewportRef.current;

      event.preventDefault();
      event.stopPropagation();

      if (element) {
        dragRef.current = dragOf({ element, clientY: event.clientY });
      }
    },
    { enabled: visible, passive: false }
  );

  useWindowEvent('mousemove', (event) => {
    const drag = dragRef.current;
    const element = viewportRef.current;

    if (!drag || !element) {
      return;
    }

    const current = scrollMetricsOf(element);
    const { size } = thumbOf({ ...current, minThumb: SCROLL_AREA.minThumb });
    const offset = drag.startOffset + (event.clientY - drag.startY) / drag.factor;

    element.scrollTop = topFromThumb({ ...current, size, offset });
    onDragged();
  });

  useWindowEvent('mouseup', () => {
    dragRef.current = null;
  });

  return { thumbRef };
};
