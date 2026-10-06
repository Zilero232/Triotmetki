import type { DragTarget } from '@/entities/hud/panel-layout';

import type { GrabbedTargetInput, InputArea, InputAreaOfInput } from './input-area.types';

import { HUD_OVERLAY } from '../../config';

export const inputAreaOf = ({ whole, screen, rects }: InputAreaOfInput): InputArea => {
  const width = Math.floor(screen.width);
  const height = Math.floor(screen.height);

  if (whole) {
    return { left: 0, top: 0, width, height };
  }

  const left = Math.max(0, Math.floor(Math.min(...rects.map((rect) => rect.left))));
  const top = Math.max(0, Math.floor(Math.min(...rects.map((rect) => rect.top))));
  const right = Math.min(width, Math.ceil(Math.max(...rects.map((rect) => rect.left + rect.width))));
  const bottom = Math.min(height, Math.ceil(Math.max(...rects.map((rect) => rect.top + rect.height))));

  if (rects.length === 0 || right < left || bottom < top) {
    return HUD_OVERLAY.noInputRect;
  }

  return { left, top, width: right - left, height: bottom - top };
};

export const inputAreaKey = ({ left, top, width, height }: InputArea): string => `${left},${top},${width},${height}`;

export const grabbedTarget = ({ tracking, targets, hovered }: GrabbedTargetInput): DragTarget | undefined =>
  tracking ? targets.find((target) => target.id === hovered && (target.movable || target.pointer)) : undefined;
