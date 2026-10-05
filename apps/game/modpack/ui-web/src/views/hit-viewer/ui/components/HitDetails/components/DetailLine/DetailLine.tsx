import type { DetailLineProps } from './DetailLine.types';

import s from './DetailLine.module.scss';

export const DetailLine = ({ label, value }: DetailLineProps) => (
  <div className={s.line}>
    <span className={s.label}>{label}</span>
    <span className={s.value}>{value}</span>
  </div>
);
