import { useInterval } from '@siberiacancode/reactuse';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { funnel, isDeepEqual } from 'remeda';

import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

import { SCROLL_AREA } from '@/shared/config';
import { scrollMetricsOf } from '@/shared/lib/scroll-metrics';
import { useThumbDrag } from '@/shared/lib/use-thumb-drag';
import { bindWheelScroll, thumbOf } from '@/shared/lib/wheel-scroll';

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
    const element = viewportRef.current;

    if (element) {
      const next = scrollMetricsOf(element);

      if (!isDeepEqual(lastRef.current, next)) {
        lastRef.current = next;
        setMetrics(next);
        metricsRef.current?.(next);
      }
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

    element.scrollTop = initialTop;

    const settled = funnel(() => scrollEndRef.current?.(element.scrollTop), { minQuietPeriodMs: SCROLL_AREA.settleMs, triggerAt: 'end' });

    scrolledRef.current = () => {
      measureRef.current();
      settled.call();
    };

    const listener = (): void => scrolledRef.current();
    const unbindWheel = bindWheelScroll({ element, onScrolled: listener, contain });

    element.addEventListener('scroll', listener);

    return () => {
      settled.flush();
      unbindWheel();
      element.removeEventListener('scroll', listener);
    };
  }, [initialTop, contain]);

  return {
    viewportRef,
    thumb,
    thumbStyle: { height: `${thumb.size}px`, top: `${thumb.offset}px` },
    thumbRef: drag.thumbRef
  };
};
