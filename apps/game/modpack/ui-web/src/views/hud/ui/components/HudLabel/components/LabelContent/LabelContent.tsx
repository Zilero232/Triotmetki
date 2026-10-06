import { PointerScopeContext } from '@/shared/lib/pointer-scope';
import { HudLines } from '@/ui-kit';

import type { LabelContentProps } from './LabelContent.types';

import { HUD_OVERLAY } from '../../../../../config';

import s from './LabelContent.module.scss';

export const LabelContent = ({ button, widget, lines, interactive }: LabelContentProps) => {
  if (button) {
    return <img alt='' className={s.buttonIcon} draggable={false} src={HUD_OVERLAY.buttonIcon} />;
  }

  if (widget) {
    return <PointerScopeContext value={interactive}>{widget.node}</PointerScopeContext>;
  }

  return lines && <HudLines lines={lines} />;
};
