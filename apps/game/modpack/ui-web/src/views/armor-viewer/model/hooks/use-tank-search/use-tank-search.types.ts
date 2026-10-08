import type { ArmorTankRow } from '../../../lib/armor-protocol';

export type UseTankSearchInput = {
  garage: readonly ArmorTankRow[];
  matches: readonly ArmorTankRow[];
  onSearch: (text: string) => void;
};
