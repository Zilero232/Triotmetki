import { HudTip } from '@/ui-kit';

import type { HudHintProps } from './HudHint.types';

import { HUD_OVERLAY } from '../../../config';

import s from './HudHint.module.scss';

const placeOf = ({ hint, screen }: HudHintProps) => {
  const { rect } = hint;
  const { hintGap: gap, unit } = HUD_OVERLAY;
  const isLowerHalf = rect.top + rect.height / 2 > screen.height / 2;

  return isLowerHalf
    ? { left: `${rect.left}${unit}`, bottom: `${screen.height - rect.top + gap}${unit}` }
    : { left: `${rect.left}${unit}`, top: `${rect.top + rect.height + gap}${unit}` };
};

export const HudHint = ({ hint, screen }: HudHintProps) => (
  <div className={s.hint} role='tooltip' style={placeOf({ hint, screen })}>
    <HudTip text={hint.text} />
  </div>
);
