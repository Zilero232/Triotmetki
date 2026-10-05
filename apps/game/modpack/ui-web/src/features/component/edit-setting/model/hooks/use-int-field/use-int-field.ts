import { useState } from 'react';

import { clampInt } from '@/shared/lib/clamp-int';
import { onEnterKey } from '@/shared/lib/enter-key';

import type { UseIntFieldInput } from './use-int-field.types';

import { INT_FIELD } from '../../../config';

export const useIntField = ({ value, min, max, onCommit }: UseIntFieldInput) => {
  const [draft, setDraft] = useState<string | null>(null);

  const apply = (raw: string): void => {
    const next = clampInt({ raw, min, max });

    if (next !== null && next !== value) {
      onCommit(next);
    }
  };

  const commit = (): void => {
    apply(draft ?? String(value));
    setDraft(null);
  };

  return {
    text: draft ?? String(value),
    range: min !== null && max !== null ? `${min}-${max}` : null,
    canDecrease: min === null || value > min,
    canIncrease: max === null || value < max,
    edit: setDraft,
    commit,
    onKey: onEnterKey(commit),
    decrease: () => apply(String(value - INT_FIELD.step)),
    increase: () => apply(String(value + INT_FIELD.step))
  };
};
