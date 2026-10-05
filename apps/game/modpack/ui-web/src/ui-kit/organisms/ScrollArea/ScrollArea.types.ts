import type { ReactNode } from 'react';

import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

export type ScrollAreaProps = {
  className?: string;
  contentClassName?: string;
  label?: string;
  initialTop?: number;
  contain?: boolean;
  onScrollEnd?: (top: number) => void;
  onMetrics?: (metrics: ScrollMetrics) => void;
  children: ReactNode;
};
