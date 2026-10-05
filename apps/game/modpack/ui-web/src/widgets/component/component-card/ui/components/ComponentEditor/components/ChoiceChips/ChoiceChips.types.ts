import type { FieldOf } from '@/shared/api/protocol';

export type ChoiceChipsProps = {
  field: FieldOf<'choice'>;
  onSelect: (value: string) => void;
};
