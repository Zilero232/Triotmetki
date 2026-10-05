import { useCallback, useRef, useState } from 'react';

import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

import type { UseVirtualListInput } from './use-virtual-list.types';

import { REPLAYS_BROWSER } from '../../../config';
import { visibleRange } from '../../../lib/visible-range';

export const useVirtualList = ({ count, rowHeight, overscan }: UseVirtualListInput) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const totalRef = useRef(count * rowHeight);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState<number>(REPLAYS_BROWSER.fallbackViewport);

  totalRef.current = count * rowHeight;

  const onMetrics = useCallback((metrics: ScrollMetrics): void => {
    const drawn = canvasRef.current?.offsetHeight ?? 0;
    const scale = drawn > 0 && totalRef.current > 0 ? drawn / totalRef.current : 1;

    setScrollTop(metrics.top / scale);

    if (metrics.viewport > 0) {
      setViewport(metrics.viewport / scale);
    }
  }, []);

  return {
    canvasRef,
    ...visibleRange({ scrollTop, viewport, rowHeight, count, overscan }),
    onMetrics
  };
};
