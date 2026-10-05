import { clamp } from 'remeda';

import { HUD_PROTOCOL } from '@/shared/api/hud-protocol';

import type { Measured, StickyInput, WheelScaleInput } from './panel-size.types';

export const stickySize = ({ previous, next }: StickyInput): Measured =>
  previous?.lines === next.lines
    ? { lines: next.lines, width: Math.max(previous.width, next.width), height: Math.max(previous.height, next.height) }
    : next;

export const wheelScale = ({ current, deltaY }: WheelScaleInput): number => {
  const { min, max, step } = HUD_PROTOCOL.scale;

  if (deltaY === 0) {
    return current;
  }

  const next = current + (deltaY < 0 ? step : -step);

  return Math.round(clamp(next, { min, max }) * 100) / 100;
};
