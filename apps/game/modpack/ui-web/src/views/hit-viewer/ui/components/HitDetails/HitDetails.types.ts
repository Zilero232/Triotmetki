import type { ViewerRow } from '../../../lib/viewer-protocol';

export type HitDetailsProps = {
  row: ViewerRow;
  labels: Record<string, string>;
};
