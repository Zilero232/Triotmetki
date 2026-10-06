import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

export type ChangedMetricsInput = { element: HTMLElement | null; last: ScrollMetrics };

export type BindScrollAreaInput = {
  element: HTMLElement;
  initialTop: number;
  contain: boolean;
  onScroll: () => void;
  onSettle: (top: number) => void;
};

export type ScrollBinding = { scrolled: () => void; unbind: () => void };
