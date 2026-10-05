import clsx from 'clsx';

import type { MarksBarProps } from './MarksBar.types';

import s from './MarksBar.module.scss';

const at = (share: number): string => `${String(Math.round(share * 1000) / 10)}%`;

export const MarksBar = ({ bar, width }: MarksBarProps) => (
  <div className={s.bar} style={{ width: `${String(width)}rem` }}>
    <div className={s.track}>
      <div className={clsx(s.fill, s[bar.tone])} style={{ width: at(bar.fill) }} />
      <span className={s.hold} style={{ left: at(bar.hold) }} />
    </div>
  </div>
);
