'use client';

import { clsx } from 'clsx';

import { useDataTable } from '@/shared/lib/use-data-table';

import type { DataTableProps } from '../../DataTable.types';

import { DATA_TABLE } from '../../DataTable.constants';
import { DataTableCards } from '../DataTableCards';
import { DataTableHead } from '../DataTableHead';
import { DataTableRows } from '../DataTableRows';
import { DataTableSkeleton } from '../DataTableSkeleton';
import { DataTableToolbar } from '../DataTableToolbar';
import { DataTableVirtualRows } from '../DataTableVirtualRows';

import s from '../../DataTable.module.scss';

export const DataTableContent = <T,>({
  data,
  columns,
  initialSorting = [],
  virtualizeAfter = DATA_TABLE.virtualizeAfter,
  density = 'default',
  rowHeight = DATA_TABLE.rowHeight[density],
  isLoading = false,
  skeletonRows = DATA_TABLE.skeletonRows,
  emptyState,
  caption,
  summary,
  toolbar,
  footer,
  className,
  getRowId,
  pinnedRowIds,
  onRowClick,
  rowTint,
  getRowClass,
  getRowLink,
  renderCard,
  isMediaFirst = false
}: DataTableProps<T>) => {
  'use no memo';

  const { table, rows, scrollNode, setScrollNode, barMax, columnCount, isVirtual, isEmpty, hasCards, showTable, showCards } = useDataTable({
    data,
    columns,
    getRowId,
    pinnedRowIds,
    initialSorting,
    virtualizeAfter,
    isLoading,
    hasCards: Boolean(renderCard)
  });

  return (
    <div
      className={clsx(s.frame, className)}
      data-cards={hasCards}
      data-density={density}
      data-media-first={isMediaFirst}
      style={{ '--table-row-h': `${rowHeight}px` }}
    >
      {(summary || toolbar) && <DataTableToolbar summary={summary} toolbar={toolbar} />}
      {showTable && !(hasCards && isEmpty) && (
        <div
          ref={setScrollNode}
          aria-label={caption}
          className={s.root}
          data-virtual={isVirtual}
          role={caption ? 'region' : undefined}
          tabIndex={caption ? 0 : undefined}
        >
          <table aria-rowcount={isVirtual ? rows.length + 1 : undefined} className={s.table}>
            {caption && <caption className={s.caption}>{caption}</caption>}
            <DataTableHead table={table} />
            {isLoading && <DataTableSkeleton columnCount={columnCount} rowCount={skeletonRows} />}
            {!isLoading && isVirtual && (
              <DataTableVirtualRows
                barMax={barMax}
                columnCount={columnCount}
                getRowClass={getRowClass}
                getRowLink={getRowLink}
                rowHeight={rowHeight}
                rows={rows}
                rowTint={rowTint}
                scrollElement={() => scrollNode}
                onRowClick={onRowClick}
              />
            )}
            {!isLoading && !isVirtual && (
              <DataTableRows
                barMax={barMax}
                getRowClass={getRowClass}
                getRowLink={getRowLink}
                rows={rows}
                rowTint={rowTint}
                onRowClick={onRowClick}
              />
            )}
          </table>
          {isEmpty && emptyState}
        </div>
      )}
      {hasCards && isEmpty && <div className={s.emptyPanel}>{emptyState}</div>}
      {showCards && !isEmpty && renderCard && (
        <DataTableCards isLoading={isLoading} renderCard={renderCard} rows={rows} skeletonRows={skeletonRows} />
      )}
      {footer && <div className={s.footer}>{footer}</div>}
    </div>
  );
};
