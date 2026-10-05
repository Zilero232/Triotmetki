import clsx from 'clsx';

import type { SelectProps } from './Select.types';

import { Icon } from '../../atoms/Icon';

import s from './Select.module.scss';

export const Select = ({ label, items, value, isOpen, onToggle, onSelect }: SelectProps) => {
  const current = items.find((item) => item.value === value);

  return (
    <div className={s.picker}>
      <button
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        aria-label={label}
        className={clsx(s.trigger, isOpen && s.triggerOpen)}
        type='button'
        onClick={onToggle}
      >
        <span className={s.value}>{current?.label ?? value}</span>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} tone='muted' />
      </button>
      {isOpen && (
        <div aria-label={label} className={s.list} role='listbox'>
          {items.map((item) => (
            <button
              key={item.value}
              aria-selected={item.value === value}
              className={clsx(s.item, item.value === value && s.itemOn)}
              role='option'
              type='button'
              onClick={() => onSelect(item.value)}
            >
              <span className={s.itemLabel}>{item.label}</span>
              {item.value === value && <Icon name='check' size={12} tone='accent' />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
