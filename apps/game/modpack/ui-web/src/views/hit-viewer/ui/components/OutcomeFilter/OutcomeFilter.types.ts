import type { ToneCount } from '../../../lib/hit-filter';
import type { ViewerSummary, ViewerTone } from '../../../lib/viewer-protocol';

export type OutcomeFilterProps = {
  counts: ToneCount[];
  total: number;
  tone: ViewerTone | null;
  summary: ViewerSummary | null;
  labels: Record<string, string>;
  onPick: (tone: ViewerTone | null) => void;
};
