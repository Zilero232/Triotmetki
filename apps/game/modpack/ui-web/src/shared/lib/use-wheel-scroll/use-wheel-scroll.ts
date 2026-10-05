import { useCallback, useRef } from 'react';

import { bindWheelScroll } from '@/shared/lib/wheel-scroll';

import type { UseWheelScrollInput, WheelScrollRef } from './use-wheel-scroll.types';

export const useWheelScroll = ({ onScrolled, contain = false }: UseWheelScrollInput = {}): WheelScrollRef => {
  const unbindRef = useRef<(() => void) | null>(null);
  const scrolledRef = useRef(onScrolled);

  scrolledRef.current = onScrolled;

  return useCallback(
    (node: HTMLElement | null): void => {
      unbindRef.current?.();
      unbindRef.current = node ? bindWheelScroll({ element: node, onScrolled: () => scrolledRef.current?.(), contain }) : null;
    },
    [contain]
  );
};
