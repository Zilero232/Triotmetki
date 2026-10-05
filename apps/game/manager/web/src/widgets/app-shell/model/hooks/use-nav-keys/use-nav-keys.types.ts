import type { SectionId } from '@/shared/lib';

export type UseNavKeysInput = {
  sections: readonly SectionId[];
  onSelect: (section: SectionId) => void;
};
