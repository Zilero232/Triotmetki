import { clamp, round } from 'remeda';

import { rem } from '@/shared/lib/css-unit';

import type {
  Bounds,
  BoundsInput,
  CentredFrameInput,
  ClampFrameInput,
  FitFrameInput,
  Frame,
  FrameLayout,
  LayoutInput,
  MoveFrameInput,
  OpeningFrameInput,
  ResizeFrameInput,
  ZoomStepInput
} from './frame.types';

import { WINDOW_FRAME } from '../../config';

const spanOf = (bounds: Bounds) => ({ width: Math.max(bounds.right - bounds.left, 0), height: Math.max(bounds.bottom - bounds.top, 0) });

export const boundsOf = ({ screen, view }: BoundsInput): Bounds => {
  const width = view.width > 0 ? view.width : screen.width;
  const height = view.height > 0 ? view.height : screen.height;
  const bounds = {
    left: Math.max(0, -view.x),
    top: Math.max(0, -view.y),
    right: Math.min(width, screen.width - view.x),
    bottom: Math.min(height, screen.height - view.y)
  };

  const span = spanOf(bounds);

  return span.width > 0 && span.height > 0 ? bounds : { left: 0, top: 0, right: screen.width, bottom: screen.height };
};

const insetOf = (bounds: Bounds): Bounds => {
  const span = spanOf(bounds);
  const x = span.width > WINDOW_FRAME.margin * 2 ? WINDOW_FRAME.margin : 0;
  const y = span.height > WINDOW_FRAME.margin * 2 ? WINDOW_FRAME.margin : 0;

  return { left: bounds.left + x, top: bounds.top + y, right: bounds.right - x, bottom: bounds.bottom - y };
};

export const clampFrame = ({ frame, bounds: outer }: ClampFrameInput): Frame => {
  const bounds = insetOf(outer);
  const span = spanOf(bounds);
  const width = clamp(frame.width, { min: Math.min(WINDOW_FRAME.minSize.width, span.width), max: span.width });
  const height = clamp(frame.height, { min: Math.min(WINDOW_FRAME.minSize.height, span.height), max: span.height });

  return {
    x: clamp(frame.x, { min: bounds.left, max: Math.max(bounds.right - width, bounds.left) }),
    y: clamp(frame.y, { min: bounds.top, max: Math.max(bounds.bottom - height, bounds.top) }),
    width,
    height
  };
};

export const centredFrame = ({ bounds, size = WINDOW_FRAME.defaultSize }: CentredFrameInput): Frame => {
  const span = spanOf(bounds);
  const frame = clampFrame({ frame: { x: bounds.left, y: bounds.top, width: size.width, height: size.height }, bounds });

  return { ...frame, x: bounds.left + Math.round((span.width - frame.width) / 2), y: bounds.top + Math.round((span.height - frame.height) / 2) };
};

export const fitFrame = ({ saved, bounds }: FitFrameInput): Frame =>
  saved.width > 0 && saved.height > 0 ? centredFrame({ bounds, size: { width: saved.width, height: saved.height } }) : centredFrame({ bounds });

export const openingFrame = ({ placed, saved, bounds }: OpeningFrameInput): Frame => {
  if (placed) {
    return clampFrame({ frame: placed, bounds });
  }

  return saved ? fitFrame({ saved, bounds }) : centredFrame({ bounds });
};

export const moveFrame = ({ frame, dx, dy, bounds }: MoveFrameInput): Frame =>
  clampFrame({ frame: { ...frame, x: frame.x + dx, y: frame.y + dy }, bounds });

export const resizeFrame = ({ frame, dx, dy, edge, bounds }: ResizeFrameInput): Frame => {
  const room = insetOf(bounds);
  const width = edge === 'bottom' ? frame.width : Math.min(frame.width + dx, room.right - frame.x);
  const height = edge === 'right' ? frame.height : Math.min(frame.height + dy, room.bottom - frame.y);

  return clampFrame({ frame: { ...frame, width, height }, bounds });
};

export const zoomStep = ({ zoom, direction }: ZoomStepInput): number => {
  const steps: readonly number[] = WINDOW_FRAME.zoomSteps;
  const index = steps.findIndex((step) => step >= zoom);
  const current = index === -1 ? steps.length - 1 : index;
  const exact = steps[current] === zoom;
  const next = direction > 0 ? (exact ? current + 1 : current) : current - 1;

  return steps[clamp(next, { min: 0, max: steps.length - 1 })] ?? WINDOW_FRAME.defaultZoom;
};

export const layoutOf = ({ frame, zoom }: LayoutInput): FrameLayout => {
  const scale = zoom / WINDOW_FRAME.percent;
  const inner = { width: frame.width / scale, height: frame.height / scale };

  return {
    inner,
    scale,
    compactNav: inner.width < WINDOW_FRAME.compactNavWidth,
    columns: inner.width >= WINDOW_FRAME.twoColumnsWidth ? 2 : 1
  };
};

export const toRem = (value: number): string => rem(round(value, 2));
