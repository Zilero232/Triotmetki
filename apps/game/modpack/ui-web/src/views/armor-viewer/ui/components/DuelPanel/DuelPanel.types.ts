import type { ArmorState } from '../../../lib/armor-protocol';

export type DuelPanelProps = {
  state: ArmorState;
  onAttacker: (cd: number) => void;
  onShell: (index: number) => void;
  onDistance: (metres: number) => void;
};
