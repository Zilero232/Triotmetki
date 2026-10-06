import clsx from 'clsx';

import { fillScaleStyle } from '@/shared/lib/bar-fill';
import { rem } from '@/shared/lib/css-unit';

import type { MarksBarProps } from './MarksBar.types';

import { shareText } from '../../../lib/marks-panel-view';

import s from './MarksBar.module.scss';

export const MarksBar = ({ bar, width }: MarksBarProps) => (
  <div className={s.bar} style={{ width: rem(width) }}>
    <div className={s.track}>
      <div className={clsx(s.fill, s[bar.tone])} style={fillScaleStyle(bar.fill)} />
      <span className={s.hold} style={{ left: shareText(bar.hold) }} />
    </div>
  </div>
);
