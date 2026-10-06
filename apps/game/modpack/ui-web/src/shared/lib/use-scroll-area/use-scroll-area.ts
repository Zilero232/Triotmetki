import { useInterval } from '@siberiacancode/reactuse';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

import { SCROLL_AREA } from '@/shared/config';
import { bindScrollArea, changedMetrics } from '@/shared/lib/scroll-binding';
import { useThumbDrag } from '@/shared/lib/use-thumb-drag';
import { thumbOf } from '@/shared/lib/wheel-scroll';

import type { UseScrollAreaInput } from './use-scroll-area.types';

export const useScrollArea = ({ initialTop = 0, contain = false, onScrollEnd, onMetrics }: UseScrollAreaInput = {}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef(onScrollEnd);
  const metricsRef = useRef(onMetrics);
  const lastRef = useRef<ScrollMetrics>(SCROLL_AREA.emptyMetrics);
  const [metrics, setMetrics] = useState<ScrollMetrics>(SCROLL_AREA.emptyMetrics);

  scrollEndRef.current = onScrollEnd;
  metricsRef.current = onMetrics;

  const measureRef = useRef(() => {
    const next = changedMetrics({ element: viewportRef.current, last: lastRef.current });

    if (next) {
      lastRef.current = next;
      setMetrics(next);
      metricsRef.current?.(next);
    }
  });

  const scrolledRef = useRef(() => measureRef.current());
  const thumb = thumbOf({ ...metrics, minThumb: SCROLL_AREA.minThumb });
  const drag = useThumbDrag({ viewportRef, visible: thumb.visible, onDragged: () => scrolledRef.current() });

  useLayoutEffect(() => {
    measureRef.current();
  });

  useInterval(() => measureRef.current(), SCROLL_AREA.measureMs);

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) {
      return undefined;
    }

    const binding = bindScrollArea({
      element,
      initialTop,
      contain,
      onScroll: () => measureRef.current(),
      onSettle: (top) => scrollEndRef.current?.(top)
    });

    scrolledRef.current = binding.scrolled;

    return binding.unbind;
  }, [initialTop, contain]);

  return {
    viewportRef,
    thumb,
    thumbStyle: { height: `${thumb.size}px`, top: `${thumb.offset}px` },
    thumbRef: drag.thumbRef
  };
};
