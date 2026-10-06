import clsx from 'clsx';

import { HudText, toneClass } from '@/ui-kit';

import type { TankCellProps } from './TankCell.types';

import s from './TankCell.module.scss';

export const TankCell = ({ cell, isStart }: TankCellProps) => (
  <div className={clsx(s.cell, isStart && s.start)}>
    <span className={s.label}>{cell.label}</span>
    <div className={s.line}>
      <HudText className={clsx(s.value, toneClass(cell.tone))} color={cell.color} text={cell.value} />
      <HudText className={s.note} text={cell.note} />
    </div>
  </div>
);
