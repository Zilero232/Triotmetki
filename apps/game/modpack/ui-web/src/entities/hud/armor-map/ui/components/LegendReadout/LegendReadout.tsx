import clsx from 'clsx';

import { toneClass } from '@/ui-kit';

import type { LegendReadoutProps } from './LegendReadout.types';

import s from './LegendReadout.module.scss';

export const LegendReadout = ({ readout }: LegendReadoutProps) => (
  <div className={s.readout}>
    <span className={s.title}>{readout.title}</span>
    {readout.rows.map((row, index) => (
      <div key={`${String(index)}-${row.label}`} className={clsx(s.row, toneClass(row.tone))}>
        <span className={s.label}>{row.label}</span>
        {row.value && <span className={s.value}>{row.value}</span>}
      </div>
    ))}
    {readout.verdict && <span className={clsx(s.verdict, toneClass(readout.verdict_tone))}>{readout.verdict}</span>}
  </div>
);
