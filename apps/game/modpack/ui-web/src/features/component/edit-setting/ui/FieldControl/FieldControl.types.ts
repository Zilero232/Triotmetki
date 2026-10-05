import type { SettingInput } from '@/entities/window/window-state';
import type { FieldOf } from '@/shared/api/protocol';

export type FieldControlProps = {
  field: FieldOf<'bool'> | FieldOf<'int'> | FieldOf<'text'>;
  onSet: (input: SettingInput) => void;
};
