import type { ListItemMainProps } from './ListItemMain.types';

import s from './ListItemMain.module.scss';

export const ListItemMain = ({ title, badge, children }: ListItemMainProps) => (
  <div className={s.main}>
    <div className={s.titleLine}>
      <span className={s.title}>{title}</span>
      {badge}
    </div>
    {children}
  </div>
);
