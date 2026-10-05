import type { RefObject } from 'react';

import type { Frame, Viewport } from '../../../lib/frame';
import type { GestureKind } from '../../../lib/hit';

export type Handles = Record<GestureKind, RefObject<HTMLDivElement | null>>;

export type UseFrameGestureInput = {
  frame: Frame;
  viewport: Viewport;
  onChange: (frame: Frame) => void;
  onDone: (frame: Frame) => void;
};
