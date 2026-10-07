import type { ToneCount } from '../../../lib/hit-filter';
import type { ViewerRow, ViewerState, ViewerTone } from '../../../lib/viewer-protocol';

export type HitColumnFilter = {
  tone: ViewerTone | null;
  rows: ViewerRow[];
  total: number;
  counts: ToneCount[];
  pickTone: (tone: ViewerTone | null) => void;
};

export type HitColumnProps = {
  state: ViewerState;
  filter: HitColumnFilter;
  selectedRow: ViewerRow | null;
  onPick: (index: number) => void;
};
