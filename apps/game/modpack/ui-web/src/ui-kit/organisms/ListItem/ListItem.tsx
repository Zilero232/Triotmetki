import clsx from 'clsx';

import type { ListItemProps } from './ListItem.types';

import s from './ListItem.module.scss';

export const ListItem = ({ active = false, children }: ListItemProps) => (
  <div aria-current={active || undefined} className={clsx(s.item, active && s.active)} role='listitem'>
    {children}
  </div>
);
