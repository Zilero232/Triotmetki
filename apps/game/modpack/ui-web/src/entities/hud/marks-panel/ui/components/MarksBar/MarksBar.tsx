import clsx from 'clsx';

import type { MarksBarProps } from './MarksBar.types';

import { shareText } from '../../../lib/marks-panel-view';

import s from './MarksBar.module.scss';

export const MarksBar = ({ bar, width }: MarksBarProps) => (
  <div className={s.bar} style={{ width: `${String(width)}rem` }}>
    <div className={s.track}>
      <div className={clsx(s.fill, s[bar.tone])} style={{ width: shareText(bar.fill) }} />
      <span className={s.hold} style={{ left: shareText(bar.hold) }} />
    </div>
  </div>
);
