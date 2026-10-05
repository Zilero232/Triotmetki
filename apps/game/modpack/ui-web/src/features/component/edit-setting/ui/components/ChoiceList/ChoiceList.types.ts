import type { FieldOf } from '@/shared/api/protocol';

export type ChoiceListProps = {
  field: FieldOf<'choice'>;
  onSelect: (value: string) => void;
};
