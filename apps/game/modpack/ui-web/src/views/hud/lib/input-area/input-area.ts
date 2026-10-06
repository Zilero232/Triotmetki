import type { InputArea, InputAreaOfInput } from './input-area.types';

import { HUD_OVERLAY } from '../../config';

export const inputAreaOf = ({ whole, screen, rects }: InputAreaOfInput): InputArea => {
  if (whole) {
    return { left: 0, top: 0, width: Math.round(screen.width), height: Math.round(screen.height) };
  }

  if (rects.length === 0) {
    return HUD_OVERLAY.noInputRect;
  }

  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));

  return { left: Math.floor(left), top: Math.floor(top), width: Math.ceil(right) - Math.floor(left), height: Math.ceil(bottom) - Math.floor(top) };
};

export const inputAreaKey = ({ left, top, width, height }: InputArea): string => `${left},${top},${width},${height}`;
