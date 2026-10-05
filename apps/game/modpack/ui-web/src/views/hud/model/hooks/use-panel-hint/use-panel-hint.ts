import { useEffect } from 'react';

import { nativeTooltip } from '@/shared/api/gameface';

import type { LabelLayout } from '../../../lib/label-layout';
import type { PanelHint } from './use-panel-hint.types';

export const usePanelHint = (hovered: LabelLayout | undefined): PanelHint | null => {
  const text = hovered?.panel.hint ?? '';
  const id = hovered?.id ?? null;
  const isNative = nativeTooltip.available();

  useEffect(() => {
    if (!text || !isNative) {
      return undefined;
    }

    nativeTooltip.show({ body: text });

    return () => nativeTooltip.hide();
  }, [id, text, isNative]);

  return hovered && text && !isNative ? { id: hovered.id, text, rect: hovered.rect } : null;
};
