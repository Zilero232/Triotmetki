import clsx from 'clsx';

import { barFill } from '@/shared/lib/bar-fill';
import { remBox } from '@/shared/lib/css-unit';

import type { MiniBarProps } from './MiniBar.types';

import s from './MiniBar.module.scss';

export const MiniBar = ({ value, max, width, height, tone }: MiniBarProps) => (
  <div className={s.track} style={remBox({ width, height })}>
    <div className={clsx(s.fill, s[tone])} style={remBox({ width: barFill({ value, max, width }), height })} />
  </div>
);
