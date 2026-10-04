import type { ViewerRow } from '../../../lib/viewer-protocol';

export type HitTableProps = {
  rows: ViewerRow[];
  labels: Record<string, string>;
  selected: number | null;
  onPick: (index: number) => void;
};
