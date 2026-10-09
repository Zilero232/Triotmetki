'use client';

import { useTableVirtualizer } from '@/shared/lib/use-table-virtualizer';

import type { DataTableVirtualRowsProps } from './DataTableVirtualRows.types';

import { DATA_TABLE } from '../../DataTable.constants';
import { DataTableRow } from '../DataTableRow';

export const DataTableVirtualRows = <T,>({ rows, scrollElement, rowHeight, columnCount, ...rowProps }: DataTableVirtualRowsProps<T>) => {
  'use no memo';

  const { items, paddingTop, paddingBottom } = useTableVirtualizer({
    count: rows.length,
    getScrollElement: scrollElement,
    rowHeight,
    overscan: DATA_TABLE.overscan
  });

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr aria-hidden>
          <td colSpan={columnCount} style={{ height: paddingTop, padding: 0 }} />
        </tr>
      )}
      {items.map((item) => (
        <DataTableRow
          key={rows[item.index].id}
          {...rowProps}
          ariaRowIndex={item.index + DATA_TABLE.headerRowOffset}
          height={rowHeight}
          index={item.index}
          row={rows[item.index]}
        />
      ))}
      {paddingBottom > 0 && (
        <tr aria-hidden>
          <td colSpan={columnCount} style={{ height: paddingBottom, padding: 0 }} />
        </tr>
      )}
    </tbody>
  );
};
