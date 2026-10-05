import type { FieldOf } from '@/shared/api/protocol';

export type ChoiceSelectProps = {
  field: FieldOf<'choice'>;
  onSelect: (value: string) => void;
};
