import clsx from 'clsx';

import type { IconNumberProps } from './IconNumber.types';

import { ClientIcon } from '../ClientIcon';
import { toneClass } from '../tone';

import s from './IconNumber.module.scss';

export const IconNumber = ({ icon, value, tone = 'text', size = 16, minWidth }: IconNumberProps) => (
  <span className={s.pair}>
    <ClientIcon icon={icon} size={size} />
    <span className={clsx(s.value, toneClass(tone))} style={minWidth ? { minWidth: `${minWidth}rem` } : undefined}>
      {value}
    </span>
  </span>
);
