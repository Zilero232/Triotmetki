import type { ViewerBattle, ViewerSide } from '../../../../../lib/viewer-protocol';

export type BattleCardProps = {
  battle: ViewerBattle;
  labels: Record<string, string>;
  sideLabels: Record<ViewerSide, string>;
};
