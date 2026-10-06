import type { Rect, Size } from '@/entities/hud/panel-layout';
import type { HudAttach } from '@/shared/api/hud-protocol';

import { clampRect } from '@/entities/hud/panel-layout';

import type { AttachRectInput, AttachRule, StockBarInput } from './attach.types';

import { HUD_OVERLAY } from '../../config';

const { gap, edge, bar, minimap, score } = HUD_OVERLAY.attach;

const { postmortemTips } = HUD_OVERLAY;

const bottomTop = ({ size, screen }: AttachRectInput): number => screen.height - edge - size.height;

const barBox = ({ attach }: AttachRectInput): Size => (attach.bar > 0 ? { width: attach.bar, height: bar.height } : postmortemTips);

const aboveBarTop = (input: AttachRectInput): number => input.screen.height - barBox(input).height - bar.above - input.size.height;

const rowLift = ({ attach }: AttachRectInput): number => (attach.bar > 0 ? bar.row + bar.above : 0);

const barRight = (input: AttachRectInput): Pick<Rect, 'left' | 'top'> => {
  const { attach, size, screen } = input;
  const left = screen.width / 2 + barBox(input).width / 2 + gap;

  if (left + size.width > screen.width - attach.minimap - edge) {
    return { left: screen.width / 2 + bar.split, top: aboveBarTop(input) - rowLift(input) };
  }

  return { left, top: bottomTop(input) };
};

const barCentre = (input: AttachRectInput): Pick<Rect, 'left' | 'top'> => ({
  left: (input.screen.width - input.size.width) / 2,
  top: aboveBarTop(input)
});

const minimapAbove = (input: AttachRectInput): Pick<Rect, 'left' | 'top'> => {
  const { attach, size, screen } = input;
  const left = screen.width - edge - size.width;

  if (attach.minimap <= 0) {
    return { left, top: bottomTop(input) };
  }

  return { left, top: screen.height - attach.minimap - minimap.gap - size.height };
};

const scoreRight = ({ size, screen }: AttachRectInput): Pick<Rect, 'left' | 'top'> =>
  screen.width < score.narrow
    ? { left: screen.width / 2 + score.offset - gap - size.width, top: score.under }
    : { left: screen.width / 2 + score.offset, top: score.top };

const RULES: Record<HudAttach['kind'], AttachRule> = {
  bar_right: barRight,
  bar_above: barCentre,
  minimap_above: minimapAbove,
  score_right: scoreRight
};

export const stockBarRect = ({ attach, screen }: StockBarInput): Rect | null =>
  attach.bar > 0 ? { left: (screen.width - attach.bar) / 2, top: screen.height - bar.height, width: attach.bar, height: bar.height } : null;

export const attachRect = (input: AttachRectInput): Rect =>
  clampRect({ rect: { ...RULES[input.attach.kind](input), width: input.size.width, height: input.size.height }, screen: input.screen });
