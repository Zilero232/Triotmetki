import type { Column, SplitColumnsInput } from './columns.types';

export const splitColumns = <Item>({ items, columns }: SplitColumnsInput<Item>): Column<Item>[] => {
  const count = Math.max(1, Math.floor(columns));

  return Array.from({ length: count }, (_, column) => ({ id: `column-${column}`, items: items.filter((_item, index) => index % count === column) }));
};
