import type { ViewerSide, ViewerState } from '../../../lib/viewer-protocol';

export type ViewerBarProps = {
  state: ViewerState;
  sideLabels: Record<ViewerSide, string>;
  onClose: () => void;
  onTab: (tab: ViewerSide) => void;
  onBattle: (id: string) => void;
};
