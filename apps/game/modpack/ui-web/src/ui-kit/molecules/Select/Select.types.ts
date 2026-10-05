import type { SegmentedItem } from '../Segmented';

export type SelectProps = {
  label: string;
  items: readonly SegmentedItem[];
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};
