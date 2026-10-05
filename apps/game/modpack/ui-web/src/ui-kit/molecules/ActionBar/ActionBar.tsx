import type { ActionBarProps } from './ActionBar.types';

import { Button } from '../../atoms/Button';

import s from './ActionBar.module.scss';

export const ActionBar = ({ items }: ActionBarProps) => (
  <div className={s.bar}>
    {items.map((item) => (
      <Button key={item.id} className={s.action} variant={item.variant} onClick={item.onClick}>
        {item.label}
      </Button>
    ))}
  </div>
);
