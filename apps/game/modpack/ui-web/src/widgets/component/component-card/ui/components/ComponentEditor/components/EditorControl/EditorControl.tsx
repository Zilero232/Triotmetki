import { FieldControl } from '@/features/component/edit-setting';

import type { EditorLineProps } from '../EditorLine';

import { ChoiceChips } from '../ChoiceChips';
import { OptionGallery } from '../OptionGallery';
import { SwatchPicker } from '../SwatchPicker';

export const EditorControl = ({ row, onSet, onHint }: EditorLineProps) => {
  const { field } = row;
  const select = (value: string) => onSet({ key: field.key, value });
  const hintOption = (label: string) => onHint({ label, text: field.hint ?? field.label });

  if (row.kind === 'gallery') {
    return <OptionGallery label={field.label} options={row.options} onHint={hintOption} onSelect={select} />;
  }

  if (row.kind === 'swatches') {
    return <SwatchPicker label={field.label} options={row.options} onHint={hintOption} onSelect={select} />;
  }

  if (field.type === 'choice') {
    return <ChoiceChips field={field} onSelect={select} />;
  }

  return <FieldControl field={field} onSet={onSet} />;
};
