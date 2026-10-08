import type { ArmorState } from '../../../lib/armor-protocol';
import type { ModulesPickResult } from '../../../lib/modules-pick';

export type TankPickerProps = {
  state: ArmorState;
  onPick: (cd: number) => void;
  onModules: (pick: ModulesPickResult) => void;
  onSearch: (text: string) => void;
};
