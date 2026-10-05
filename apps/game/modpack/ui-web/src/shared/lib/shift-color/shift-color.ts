import { clamp } from 'remeda';

import { HUD_TONE_COLORS } from '@/shared/config';

import type { ShiftInput } from './shift-color.types';

const channels = (hex: string): number[] => [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));

const mix = (from: string, to: string, share: number): string => {
  const target = channels(to);
  const parts = channels(from).map((value, index) =>
    Math.round(value + ((target[index] ?? value) - value) * share)
      .toString(16)
      .padStart(2, '0')
  );

  return `#${parts.join('')}`;
};

export const shiftColor = ({ delta, span }: ShiftInput): string => {
  const share = span > 0 ? clamp((delta ?? 0) / span, { min: -1, max: 1 }) : 0;

  return share < 0 ? mix(HUD_TONE_COLORS.gold.hex, HUD_TONE_COLORS.bad.hex, -share) : mix(HUD_TONE_COLORS.gold.hex, HUD_TONE_COLORS.good.hex, share);
};
