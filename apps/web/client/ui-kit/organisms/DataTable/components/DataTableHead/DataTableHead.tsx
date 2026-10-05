import { flexRender } from '@tanstack/react-table';

import type { DataTableHeadProps } from './DataTableHead.types';

import { DATA_TABLE } from '../../DataTable.constants';

import s from '../../DataTable.module.scss';

export const DataTableHead = <T,>({ table }: DataTableHeadProps<T>) => {
  'use no memo';

  return (
    <thead className={s.head}>
      {table.getHeaderGroups().map((group) => (
        <tr key={group.id}>
          {group.headers.map((header) => {
            const sorted = header.column.getIsSorted();
            const { align = 'start', width, isSticky, hideBelow, showBelow } = header.column.columnDef.meta ?? {};
            const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());

            return (
              <th
                key={header.id}
                aria-sort={sorted ? DATA_TABLE.ariaSort[sorted] : header.column.getCanSort() ? 'none' : undefined}
                className={s.th}
                data-align={align}
                data-hide-below={hideBelow}
                data-show-below={showBelow}
                data-sticky={isSticky}
                scope='col'
                style={{ width }}
              >
                {header.column.getCanSort() ? (
                  <button className={s.sort} data-sorted={Boolean(sorted)} type='button' onClick={header.column.getToggleSortingHandler()}>
                    {content}
                    {sorted && (
                      <span aria-hidden className={s.sortGlyph}>
                        {DATA_TABLE.sortGlyph[sorted]}
                      </span>
                    )}
                  </button>
                ) : (
                  content
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
};
