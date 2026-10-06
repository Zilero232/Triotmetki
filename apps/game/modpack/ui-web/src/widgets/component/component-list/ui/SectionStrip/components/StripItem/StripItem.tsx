import clsx from 'clsx';

import { Icon, Toggle } from '@/ui-kit';

import type { StripItemProps } from './StripItem.types';

import { useStripItem } from '../../../../model/hooks';

import s from './StripItem.module.scss';

export const StripItem = ({ component }: StripItemProps) => {
  const item = useStripItem(component);

  return (
    <div className={s.item}>
      <button aria-haspopup='dialog' className={s.open} type='button' onClick={item.open} {...item.tip}>
        <Icon name={item.icon} size={16} tone={item.enabled ? 'text' : 'muted'} />
        <span className={clsx(s.title, !item.enabled && s.titleOff)}>{component.title}</span>
        <Icon name='chevron-right' size={12} tone='muted' />
      </button>
      {component.switch && (
        <span className={s.switch}>
          <Toggle label={component.title} on={component.switch.value} onToggle={item.toggle} />
        </span>
      )}
    </div>
  );
};
