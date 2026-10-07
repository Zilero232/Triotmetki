import type { ViewerRow } from '../viewer-protocol';
import type { FilterRowsInput, ToneCount } from './hit-filter.types';

import { HIT_VIEWER } from '../../config';

export const toneCounts = (rows: ViewerRow[]): ToneCount[] =>
  HIT_VIEWER.tones.flatMap((tone) => {
    const matching = rows.filter((row) => row.tone === tone);
    const [first] = matching;

    return first ? [{ tone, count: matching.length, label: first.result }] : [];
  });

export const filterRows = ({ rows, tone }: FilterRowsInput): ViewerRow[] => (tone ? rows.filter((row) => row.tone === tone) : rows);
