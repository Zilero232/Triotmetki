import { Segmented, Toggle } from '@/ui-kit';

import type { FieldProps } from '../Field';

import { choiceLayout } from '../../lib/choice-layout';
import { ChoiceGallery, ChoiceList, IntField, TextField } from '../components';

export const FieldControl = ({ field, gallery, onSet }: FieldProps) => {
  if (field.type === 'bool') {
    return <Toggle label={field.label} on={field.value} onToggle={() => onSet({ key: field.key, value: !field.value })} />;
  }

  if (field.type === 'int') {
    return <IntField field={field} onSet={onSet} />;
  }

  if (field.type === 'choice' && gallery) {
    return <ChoiceGallery field={field} icons={gallery} onSelect={(value) => onSet({ key: field.key, value })} />;
  }

  if (field.type === 'choice' && choiceLayout(field.choices) === 'list') {
    return <ChoiceList field={field} onSelect={(value) => onSet({ key: field.key, value })} />;
  }

  if (field.type === 'choice') {
    return <Segmented items={field.choices} label={field.label} value={field.value} onSelect={(value) => onSet({ key: field.key, value })} />;
  }

  if (field.type === 'text') {
    return <TextField field={field} onSet={onSet} />;
  }

  return field satisfies never;
};
