import type { PreviewPanel } from '../../../lib/card-layout';

export type PanelPreviewProps = {
  panel: PreviewPanel | null;
  onMove: () => void;
};
