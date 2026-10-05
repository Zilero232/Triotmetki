import type { FieldOf } from '@/shared/api/protocol';

export type ChoiceGalleryProps = {
  field: FieldOf<'choice'>;
  icons: Record<string, string | null>;
  onSelect: (value: string) => void;
};
