import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { toneClass } from '@/ui-kit';

import type { ReportTableProps } from './ReportTable.types';

import s from './ReportTable.module.scss';

export const ReportTable = ({ rows }: ReportTableProps) => {
  const t = useT();

  return (
    <div className={s.table}>
      <div className={clsx(s.tableRow, s.tableHead)}>
        <span className={s.cellDate}>{t('reportBattle')}</span>
        <span className={clsx(s.cell, s.value)}>{t('reportDamage')}</span>
        <span className={clsx(s.cell, s.value)}>%</span>
        <span className={clsx(s.cell, s.value)}>{t('reportDelta')}</span>
      </div>
      {rows.map((row) => (
        <div key={row.key} className={s.tableRow}>
          <span className={s.cellDate}>{row.date}</span>
          <span className={clsx(s.cell, s.value)}>{row.damage}</span>
          <span className={clsx(s.cell, s.value)}>{row.percent}</span>
          <span className={clsx(s.cell, toneClass(row.tone))}>{row.delta}</span>
        </div>
      ))}
    </div>
  );
};
