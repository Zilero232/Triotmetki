import { flexRender } from '@tanstack/react-table';

import { Link } from '@/shared/i18n/navigation';
import { dataTableCell } from '@/shared/lib';

import type { DataTableCellsProps } from './DataTableCells.types';

import { CellBar } from '../../../../molecules/CellBar';

import s from '../../DataTable.module.scss';

export const DataTableCells = <T,>({ row, barMax, link = null }: DataTableCellsProps<T>) =>
  row.getVisibleCells().map((cell, index) => {
    const { align, isNumeric, isMedia, isSticky, isRank, hideBelow, showBelow, isSorted, medal, bar } = dataTableCell({ cell, barMax });
    const content = flexRender(cell.column.columnDef.cell, cell.getContext());

    return (
      <td
        key={cell.id}
        className={s.td}
        data-align={align}
        data-hide-below={hideBelow}
        data-medal={medal}
        data-media={isMedia}
        data-numeric={isNumeric}
        data-rank={isRank}
        data-show-below={showBelow}
        data-sorted={isSorted || undefined}
        data-sticky={isSticky}
      >
        {index === 0 && link && (
          <Link
            aria-hidden={link.hasCellLink || undefined}
            aria-label={link.hasCellLink ? undefined : link.label}
            className={s.rowLink}
            href={link.href}
            tabIndex={link.hasCellLink ? -1 : undefined}
          />
        )}
        {bar ? (
          <CellBar max={bar.max} tone={bar.tone} value={bar.value}>
            {content}
          </CellBar>
        ) : medal ? (
          <span className={s.medal}>{content}</span>
        ) : (
          content
        )}
      </td>
    );
  });
