import type { ViewerBattle } from '../../../lib/viewer-protocol';

export type BattlePickerProps = {
  battles: ViewerBattle[];
  current: ViewerBattle;
  label: string;
  onPick: (id: string) => void;
};

export type BattleLineProps = { battle: ViewerBattle };
