import { useEffect, useEffectEvent } from 'react';

import { addEscapeLayer } from '@/shared/lib/escape-stack';

import type { UseEscapeLayerInput } from './use-escape-layer.types';

export const useEscapeLayer = ({ kind, active = true, onEscape }: UseEscapeLayerInput): void => {
  const escape = useEffectEvent(onEscape);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    return addEscapeLayer({ kind, onEscape: () => escape() });
  }, [kind, active]);
};
