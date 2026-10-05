export type SegmentedItem<T extends string = string> = {
  value: T;
  label: string;
};

export type SegmentedProps<T extends string = string> = {
  label: string;
  items: readonly SegmentedItem<T>[];
  value: T;
  className?: string;
  onSelect: (value: T) => void;
};
