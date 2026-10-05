export type DropdownOption<Value> = {
  value: Value;
  label: string;
  hint?: string;
};

export type DropdownProps<Value> = {
  label: string;
  value: Value;
  options: readonly DropdownOption<Value>[];
  active?: boolean;
  onSelect: (value: Value) => void;
};
