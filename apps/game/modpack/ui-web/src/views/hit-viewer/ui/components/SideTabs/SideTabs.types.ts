import type { ViewerSide, ViewerState } from '../../../lib/viewer-protocol';

export type SideTabsProps = {
  tabs: ViewerState['tabs'];
  value: ViewerSide;
  label: string;
  onSelect: (side: ViewerSide) => void;
};
