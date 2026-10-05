import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

export type UseScrollAreaInput = {
  initialTop?: number;
  contain?: boolean;
  onScrollEnd?: (top: number) => void;
  onMetrics?: (metrics: ScrollMetrics) => void;
};
