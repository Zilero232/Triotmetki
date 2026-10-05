import type { SettingInput } from '@/entities/window/window-state';
import type { UiField } from '@/shared/api/protocol';

export type AdvancedFieldsProps = {
  fields: UiField[];
  initiallyOpen: boolean;
  onSet: (input: SettingInput) => void;
};
