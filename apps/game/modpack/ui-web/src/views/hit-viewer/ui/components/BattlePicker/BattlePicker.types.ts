import type { ViewerBattle, ViewerSide } from '../../../lib/viewer-protocol';

export type BattlePickerProps = {
  battles: ViewerBattle[];
  current: ViewerBattle;
  label: string;
  labels: Record<string, string>;
  sideLabels: Record<ViewerSide, string>;
  onPick: (id: string) => void;
};
