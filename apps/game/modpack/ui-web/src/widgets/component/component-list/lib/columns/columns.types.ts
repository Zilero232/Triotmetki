export type SplitColumnsInput<Item> = {
  items: readonly Item[];
  columns: number;
};

export type Column<Item> = {
  id: string;
  items: Item[];
};
