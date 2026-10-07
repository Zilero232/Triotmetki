import { useState } from 'react';

import type { HitStep } from '../../../lib/hit-step';
import type { ViewerTone } from '../../../lib/viewer-protocol';
import type { FilterPick, UseHitFilterInput } from './use-hit-filter.types';

import { filterRows, toneCounts } from '../../../lib/hit-filter';
import { hitStep } from '../../../lib/hit-step';

export const useHitFilter = ({ state, onPick }: UseHitFilterInput) => {
  const [picked, setPicked] = useState<FilterPick>({ key: '', tone: null });
  const key = `${state?.battle?.id ?? ''}:${state?.tab ?? ''}`;
  const allRows = state?.rows ?? [];
  const tone = picked.key === key ? picked.tone : null;
  const rows = filterRows({ rows: allRows, tone });

  const pickTone = (next: ViewerTone | null) => {
    setPicked({ key, tone: next });

    const visible = filterRows({ rows: allRows, tone: next });
    const [first] = visible;

    if (first && !visible.some((row) => row.index === state?.selected)) {
      onPick(first.index);
    }
  };

  const step = (by: HitStep) => {
    const next = hitStep({ indexes: rows.map((row) => row.index), selected: state?.selected ?? null, step: by });

    if (next !== null) {
      onPick(next);
    }
  };

  return { tone, rows, total: allRows.length, counts: toneCounts(allRows), pickTone, step };
};
