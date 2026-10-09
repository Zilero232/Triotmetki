import type { CatalogLayoutProps } from './CatalogLayout.types';

import s from './CatalogLayout.module.scss';

export const CatalogLayout = ({ hero, children }: CatalogLayoutProps) => (
  <div className={s.root}>
    {hero}
    <div className={s.content}>{children}</div>
  </div>
);
