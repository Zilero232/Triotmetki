import { rem } from '@/shared/lib/css-unit';
import { HudTip } from '@/ui-kit';

import type { HudHintProps } from './HudHint.types';

import { HUD_OVERLAY } from '../../../config';

import s from './HudHint.module.scss';

const placeOf = ({ hint, screen }: HudHintProps) => {
  const { rect } = hint;
  const gap = HUD_OVERLAY.hintGap;
  const isLowerHalf = rect.top + rect.height / 2 > screen.height / 2;

  return isLowerHalf
    ? { left: rem(rect.left), bottom: rem(screen.height - rect.top + gap) }
    : { left: rem(rect.left), top: rem(rect.top + rect.height + gap) };
};

export const HudHint = ({ hint, screen }: HudHintProps) => (
  <div className={s.hint} role='tooltip' style={placeOf({ hint, screen })}>
    <HudTip text={hint.text} />
  </div>
);
