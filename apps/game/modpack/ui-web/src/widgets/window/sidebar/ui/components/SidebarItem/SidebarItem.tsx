import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { useTooltip } from '@/shared/lib/use-tooltip';
import { Icon } from '@/ui-kit';

import type { SidebarItemProps } from './SidebarItem.types';

import s from './SidebarItem.module.scss';

export const SidebarItem = ({ item, compact }: SidebarItemProps) => {
  const t = useT();
  const label = t(item.labelKey);
  const tip = useTooltip(compact ? label : undefined);

  return (
    <button
      aria-current={item.active ? 'page' : undefined}
      aria-label={label}
      className={clsx(s.item, item.active && s.itemOn, compact && s.compact)}
      type='button'
      onClick={item.open}
      {...tip}
    >
      {item.active && <span aria-hidden='true' className={s.marker} />}
      <Icon name={item.icon} size={16} tone={item.iconTone} />
      {!compact && <span className={s.label}>{label}</span>}
      {!compact && item.count && <span className={clsx(s.count, item.active && s.countOn)}>{item.count}</span>}
    </button>
  );
};
