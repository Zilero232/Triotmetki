import clsx from 'clsx';

import type { BadgeProps } from './Badge.types';

import { Icon } from '../Icon';
import { BADGE } from './Badge.constants';

import s from './Badge.module.scss';

export const Badge = ({ tone = 'default', icon, children }: BadgeProps) => (
  <span className={clsx(s.badge, s[tone])}>
    {icon && <Icon className={s.icon} name={icon} size={BADGE.iconSize} tone={BADGE.iconTone[tone]} />}
    <span className={s.text}>{children}</span>
  </span>
);
