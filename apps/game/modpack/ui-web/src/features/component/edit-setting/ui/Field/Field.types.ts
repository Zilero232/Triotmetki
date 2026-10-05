import type { SettingInput } from '@/entities/window/window-state';
import type { UiField } from '@/shared/api/protocol';

export type FieldProps = {
  field: UiField;
  gallery?: Record<string, string | null>;
  onSet: (input: SettingInput) => void;
};
