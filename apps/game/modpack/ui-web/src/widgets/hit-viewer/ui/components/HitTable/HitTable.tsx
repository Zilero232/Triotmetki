import clsx from 'clsx';

import type { HitTableProps } from './HitTable.types';

import { ScrollArea } from '../../../../../shared/ui/scroll-area';
import { HIT_VIEWER } from '../../../config';

import s from './HitTable.module.scss';

export const HitTable = ({ rows, labels, selected, onPick }: HitTableProps) => (
  <div className={s.table}>
    <div className={clsx(s.row, s.head)}>
      {HIT_VIEWER.columns.map((column) => (
        <span key={column} className={clsx(s.cell, s[column])}>
          {labels[column]}
        </span>
      ))}
    </div>
    {rows.length === 0 ? (
      <div className={s.empty}>{labels.empty}</div>
    ) : (
      <ScrollArea className={s.scroll} label={labels.title}>
        {rows.map((row) => (
          <button
            key={row.index}
            aria-pressed={row.index === selected}
            className={clsx(s.row, s.item, row.index === selected && s.itemOn)}
            type='button'
            onClick={() => onPick(row.index)}
          >
            <span className={clsx(s.cell, s.number)}>{row.n}</span>
            <span className={clsx(s.cell, s.vehicle)}>{row.vehicle}</span>
            <span className={clsx(s.cell, s.result, s[row.tone])}>{row.result}</span>
            <span className={clsx(s.cell, s.shell)}>{row.shell}</span>
            <span className={clsx(s.cell, s.damage)}>{row.damage}</span>
            <span className={clsx(s.cell, s.angle)}>{row.angle}</span>
            <span className={clsx(s.cell, s.armor)}>{row.armor}</span>
          </button>
        ))}
      </ScrollArea>
    )}
  </div>
);
