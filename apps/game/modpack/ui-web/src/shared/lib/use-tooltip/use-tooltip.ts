import { useCallback, useEffect, useRef } from 'react';

import { nativeTooltip } from '@/shared/api/gameface';

import type { TooltipProps } from './use-tooltip.types';

export const useTooltip = (text: string | undefined): TooltipProps => {
  const shownRef = useRef(false);

  const hide = useCallback((): void => {
    if (shownRef.current) {
      shownRef.current = false;
      nativeTooltip.hide();
    }
  }, []);

  useEffect(() => hide, [hide]);

  if (!text) {
    return {};
  }

  if (!nativeTooltip.available()) {
    return { title: text };
  }

  return {
    onMouseEnter: () => {
      shownRef.current = nativeTooltip.show({ body: text });
    },
    onMouseLeave: hide,
    onMouseDown: hide
  };
};
