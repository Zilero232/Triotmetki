import type { ReplayItem } from '@/entities/replay/replay';

export type ReplayListProps = {
  items: readonly ReplayItem[];
  selectedId: string | null;
  label: string;
  resetKey: string;
  onSelect: (id: string) => void;
};
