import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

export type WheelScrollInput = {
  top: number;
  deltaY: number;
  max: number;
  step: number;
};

export type ThumbInput = ScrollMetrics & {
  minThumb: number;
};

export type Thumb = {
  visible: boolean;
  size: number;
  offset: number;
};

export type TopFromThumbInput = ScrollMetrics & {
  offset: number;
  size: number;
};

export type WheelDelta = Pick<WheelEvent, 'deltaY'> & {
  wheelDelta?: number;
  wheelDeltaY?: number;
};

export type WheelRoot = Pick<Document, 'addEventListener' | 'removeEventListener'>;

export type BindWheelScrollInput = {
  element: HTMLElement;
  onScrolled?: () => void;
};
