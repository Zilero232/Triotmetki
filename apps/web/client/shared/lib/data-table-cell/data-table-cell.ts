import type { DataTableCellInput, DataTableCellView } from './data-table-cell.types';

import { rankMedal } from '../rank-medal';

export const dataTableCell = <T>({ cell, barMax }: DataTableCellInput<T>): DataTableCellView => {
  const { align = 'start', isNumeric, isMedia, isSticky, isRank, bar, hideBelow, showBelow } = cell.column.columnDef.meta ?? {};
  const raw = cell.getValue();
  const isNumber = typeof raw === 'number';

  return {
    align,
    isNumeric,
    isMedia,
    isSticky,
    isRank,
    hideBelow,
    showBelow,
    isSorted: Boolean(cell.column.getIsSorted()),
    medal: rankMedal(isRank && isNumber ? raw : null),
    bar: bar && isNumber ? { value: raw, max: bar.max ?? barMax[cell.column.id] ?? 0, tone: bar.tone } : null
  };
};
