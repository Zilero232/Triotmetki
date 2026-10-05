import type { PageHeaderProps } from './PageHeader.types';

import { Icon } from '../../atoms/Icon';

import s from './PageHeader.module.scss';

export const PageHeader = ({ icon, title, hint }: PageHeaderProps) => (
  <header className={s.header}>
    <div className={s.titles}>
      <h2 className={s.title}>
        <span className={s.icon}>
          <Icon name={icon} size={20} tone='muted' />
        </span>
        {title}
      </h2>
      {hint && <p className={s.hint}>{hint}</p>}
    </div>
  </header>
);
