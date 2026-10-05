import type { EmptyProps } from './Empty.types';

import { Icon } from '../../atoms/Icon';

import s from './Empty.module.scss';

export const Empty = ({ children, icon = 'info' }: EmptyProps) => (
  <div className={s.empty} role='status'>
    <Icon className={s.icon} name={icon} size={22} tone='muted' />
    <span className={s.text}>{children}</span>
  </div>
);
