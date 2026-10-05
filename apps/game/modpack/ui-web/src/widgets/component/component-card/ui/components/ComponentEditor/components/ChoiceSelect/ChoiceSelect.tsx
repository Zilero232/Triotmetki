import { Select } from '@/ui-kit';

import type { ChoiceSelectProps } from './ChoiceSelect.types';

import { useChoiceSelect } from '../../../../../model/hooks';

export const ChoiceSelect = ({ field, onSelect }: ChoiceSelectProps) => {
  const select = useChoiceSelect(onSelect);

  return (
    <Select isOpen={select.isOpen} items={field.choices} label={field.label} value={field.value} onSelect={select.select} onToggle={select.toggle} />
  );
};
