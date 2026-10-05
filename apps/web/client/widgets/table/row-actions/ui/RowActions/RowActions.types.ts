import type { PinToggleProps } from '@/features/app/pin-rows';
import type { CompareEntry } from '@/features/compare/compare-selection';

export type RowActionsProps = {
  name: string;
  pin?: Pick<PinToggleProps, 'id' | 'isOn' | 'scope'>;
  compare?: CompareEntry;
};
