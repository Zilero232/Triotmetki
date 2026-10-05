import type { ClientSize, ViewRect } from '@/shared/api/gameface';
import type { UiWindow } from '@/shared/api/protocol';

import type { RESIZE_EDGE } from '../../config';

export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Viewport = {
  screen: ClientSize;
  view: ViewRect;
  scale: number;
};

export type BoundsInput = Pick<Viewport, 'screen' | 'view'>;

export type ResizeEdge = (typeof RESIZE_EDGE)[keyof typeof RESIZE_EDGE];

export type CentredFrameInput = {
  bounds: Bounds;
  size?: ClientSize;
};

export type FitFrameInput = {
  saved: UiWindow;
  bounds: Bounds;
};

export type ClampFrameInput = {
  frame: Frame;
  bounds: Bounds;
};

export type MoveFrameInput = ClampFrameInput & {
  dx: number;
  dy: number;
};

export type ResizeFrameInput = MoveFrameInput & {
  edge: ResizeEdge;
};

export type ZoomStepInput = {
  zoom: number;
  direction: -1 | 1;
};

export type LayoutInput = {
  frame: Frame;
  zoom: number;
};

export type FrameLayout = {
  inner: ClientSize;
  scale: number;
  compactNav: boolean;
  columns: 1 | 2;
};

export type OpeningFrameInput = {
  placed: Frame | null;
  saved: UiWindow | null;
  bounds: Bounds;
};
