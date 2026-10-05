import clsx from 'clsx';

import type { StatTileProps } from './StatTile.types';

import s from './StatTile.module.scss';

export const StatTile = ({ label, value, accent = false, wide = false }: StatTileProps) => (
  <span className={clsx(s.tile, wide && s.wide)}>
    <span className={s.label}>{label}</span>
    <span className={clsx(s.value, accent && s.accent)}>{value}</span>
  </span>
);
