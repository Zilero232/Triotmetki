import type { SettingInput } from '@/entities/window/window-state';
import type { FieldOf } from '@/shared/api/protocol';

export type TextFieldProps = {
  field: FieldOf<'text'>;
  onSet: (input: SettingInput) => void;
};
