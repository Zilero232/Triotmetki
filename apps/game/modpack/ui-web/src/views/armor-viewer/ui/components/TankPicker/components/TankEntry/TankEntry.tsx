import clsx from 'clsx';

import type { TankEntryProps } from './TankEntry.types';

import { tierLabel } from '../../../../../lib/fill-label';

import s from './TankEntry.module.scss';

export const TankEntry = ({ row, onPick }: TankEntryProps) => (
  <button aria-pressed={row.active} className={clsx(s.entry, row.active && s.entryOn)} type='button' onClick={() => onPick(row.cd)}>
    <span className={s.tier}>{tierLabel(row.tier)}</span>
    <span className={clsx(s.name, row.own && s.own)}>{row.name}</span>
  </button>
);
