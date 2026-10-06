import { PointerScopeContext } from '@/shared/lib/pointer-scope';
import { HudLines } from '@/ui-kit';

import type { LabelContentProps } from './LabelContent.types';

export const LabelContent = ({ widget, lines, interactive }: LabelContentProps) => {
  if (widget) {
    return <PointerScopeContext value={interactive}>{widget.node}</PointerScopeContext>;
  }

  return lines && <HudLines lines={lines} />;
};
