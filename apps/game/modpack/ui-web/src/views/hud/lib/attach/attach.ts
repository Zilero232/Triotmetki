import type { Rect } from '@/entities/hud/panel-layout';
import type { HudAttach } from '@/shared/api/hud-protocol';

import { clampRect } from '@/entities/hud/panel-layout';

import type { AttachRectInput, AttachRule } from './attach.types';

import { HUD_OVERLAY } from '../../config';

const { gap, edge, bar, log, minimap, score } = HUD_OVERLAY.attach;

const bottomTop = ({ size, screen }: AttachRectInput): number => screen.height - edge - size.height;

const aboveBarTop = ({ size, screen }: AttachRectInput): number => screen.height - bar.height - bar.above - size.height;

const barRight = (input: AttachRectInput): Pick<Rect, 'left' | 'top'> => {
  const { attach, size, screen } = input;
  const barEnd = screen.width / 2 + attach.bar / 2;
  const left = barEnd + gap;

  if (left + size.width > screen.width - attach.minimap - edge) {
    return { left: screen.width / 2 + bar.split, top: aboveBarTop(input) };
  }

  return { left, top: bottomTop(input) };
};

const barLeft = (input: AttachRectInput): Pick<Rect, 'left' | 'top'> => {
  const { attach, size, screen } = input;
  const left = screen.width / 2 - attach.bar / 2 - gap - size.width;

  if (left < log.right) {
    return { left: screen.width / 2 - bar.split - size.width, top: aboveBarTop(input) };
  }

  return { left, top: bottomTop(input) };
};

const minimapAbove = ({ attach, size, screen }: AttachRectInput): Pick<Rect, 'left' | 'top'> => ({
  left: screen.width - edge - size.width,
  top: screen.height - attach.minimap - minimap.gap - size.height
});

const scoreRight = ({ size, screen }: AttachRectInput): Pick<Rect, 'left' | 'top'> =>
  screen.width < score.narrow
    ? { left: (screen.width - size.width) / 2, top: score.under }
    : { left: screen.width / 2 + score.offset, top: score.top };

const RULES: Record<HudAttach['kind'], AttachRule> = {
  bar_right: barRight,
  bar_left: barLeft,
  minimap_above: minimapAbove,
  score_right: scoreRight
};

export const attachRect = (input: AttachRectInput): Rect =>
  clampRect({ rect: { ...RULES[input.attach.kind](input), width: input.size.width, height: input.size.height }, screen: input.screen });
