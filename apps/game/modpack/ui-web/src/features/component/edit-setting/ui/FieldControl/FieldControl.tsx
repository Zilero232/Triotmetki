import { Toggle } from '@/ui-kit';

import type { FieldControlProps } from './FieldControl.types';

import { IntField, TextField } from '../components';

export const FieldControl = ({ field, onSet }: FieldControlProps) => {
  if (field.type === 'bool') {
    return <Toggle label={field.label} on={field.value} onToggle={() => onSet({ key: field.key, value: !field.value })} />;
  }

  if (field.type === 'int') {
    return <IntField field={field} onSet={onSet} />;
  }

  return <TextField field={field} onSet={onSet} />;
};
