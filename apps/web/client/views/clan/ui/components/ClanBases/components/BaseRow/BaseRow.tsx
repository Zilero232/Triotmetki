import type { BaseRowProps } from './BaseRow.types';

import s from './BaseRow.module.scss';

export const BaseRow = ({ label, children }: BaseRowProps) => (
  <li className={s.root}>
    <span className={s.label}>{label}</span>
    <span className={s.values}>{children}</span>
  </li>
);
