import type { ListProps } from './List.types';

import s from './List.module.scss';

export const List = ({ label, children }: ListProps) => (
  <div aria-label={label} className={s.list} role='list'>
    {children}
  </div>
);
