import type { PageColumnsProps } from './PageColumns.types';

import s from './PageColumns.module.scss';

export const PageColumns = ({ children, aside, layout = 'aside', isAsideFirst = false }: PageColumnsProps) => (
  <div className={s.root} data-aside-first={isAsideFirst || undefined} data-layout={layout}>
    <div className={s.main}>{children}</div>
    {aside && <div className={s.aside}>{aside}</div>}
  </div>
);
