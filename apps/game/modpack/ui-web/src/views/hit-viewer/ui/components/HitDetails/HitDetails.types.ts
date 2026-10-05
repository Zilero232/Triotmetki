import type { ViewerRow } from '../../../lib/viewer-protocol';

export type HitDetailsProps = {
  row: ViewerRow;
  labels: Record<string, string>;
};

export type DetailLineProps = { label: string | undefined; value: string };
