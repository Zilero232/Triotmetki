import type { ArmorLabels, ArmorState } from '../../../../../lib/armor-protocol';
import type { ModulesPickResult } from '../../../../../lib/modules-pick';

export type ModulePickerProps = {
  labels: ArmorLabels;
  modules: ArmorState['modules'];
  onPick: (pick: ModulesPickResult) => void;
};
