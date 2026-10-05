import type { ReplayItem } from '@/entities/replay/replay';

export type ReplayRowProps = {
  item: ReplayItem;
  top: number;
  height: number;
  selected: boolean;
  onSelect: (id: string) => void;
};

export type RowPartProps = { item: ReplayItem };
