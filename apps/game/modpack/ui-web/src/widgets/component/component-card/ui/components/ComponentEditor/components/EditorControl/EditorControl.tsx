import { match, P } from 'ts-pattern';

import { FieldControl } from '@/features/component/edit-setting';

import type { EditorLineProps } from '../EditorLine';

import { ChoiceChips } from '../ChoiceChips';
import { ChoiceSelect } from '../ChoiceSelect';
import { OptionGallery } from '../OptionGallery';
import { SwatchPicker } from '../SwatchPicker';

export const EditorControl = ({ row, onSet, onHint }: EditorLineProps) => {
  const { field } = row;
  const select = (value: string) => onSet({ key: field.key, value });
  const hintOption = (label: string) => onHint({ label, text: field.hint ?? field.label });

  return match(row)
    .with({ kind: 'gallery' }, ({ optionRows }) => <OptionGallery label={field.label} rows={optionRows} onHint={hintOption} onSelect={select} />)
    .with({ kind: 'swatches' }, ({ optionRows }) => <SwatchPicker label={field.label} rows={optionRows} onHint={hintOption} onSelect={select} />)
    .with({ kind: 'select', field: { type: 'choice' } }, (choice) => <ChoiceSelect field={choice.field} onSelect={select} />)
    .with({ field: { type: 'choice' } }, (choice) => <ChoiceChips field={choice.field} onSelect={select} />)
    .with({ field: { type: P.not('choice') } }, (other) => <FieldControl field={other.field} onSet={onSet} />)
    .exhaustive();
};
