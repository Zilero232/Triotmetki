import { useState } from 'react';

import { useEscapeLayer } from '@/shared/lib/use-escape-layer';

import type { FieldFocusHandlers, UseFieldEscapeInput } from './use-field-escape.types';

export const useFieldEscape = ({ onEscape, onFocus, onBlur }: UseFieldEscapeInput): FieldFocusHandlers => {
  const [field, setField] = useState<HTMLInputElement | null>(null);

  useEscapeLayer({
    kind: 'field',
    active: field !== null,
    onEscape: () => {
      if (onEscape) {
        onEscape();

        return;
      }

      field?.blur();
    }
  });

  return {
    onFocus: (event) => {
      setField(event.currentTarget);
      onFocus?.(event);
    },
    onBlur: (event) => {
      setField(null);
      onBlur?.(event);
    }
  };
};
