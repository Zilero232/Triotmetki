import clsx from 'clsx';

import type { DropdownProps } from './Dropdown.types';

import { useDropdown } from '../../../model/hooks';
import { ReplayIcon } from '../ReplayIcon';

import s from './Dropdown.module.scss';

export const Dropdown = <Value,>({ label, value, options, active = false, onSelect }: DropdownProps<Value>) => {
  const dropdown = useDropdown({ onSelect });
  const current = options.find((option) => option.value === value);

  return (
    <div className={s.dropdown}>
      <button aria-expanded={dropdown.open} className={clsx(s.trigger, active && s.triggerActive)} type='button' onClick={dropdown.toggle}>
        <span className={s.label}>{label}</span>
        <span className={s.value}>{current?.label ?? ''}</span>
        <ReplayIcon className={s.chevron} name='chevron' size={14} />
      </button>
      {dropdown.open && (
        <>
          <button aria-label={label} className={s.backdrop} tabIndex={-1} type='button' onClick={dropdown.close} />
          <div ref={dropdown.menuRef} className={s.menu} role='listbox'>
            {options.map((option) => (
              <button
                key={String(option.value)}
                aria-selected={option.value === value}
                className={clsx(s.choice, option.value === value && s.choiceOn)}
                role='option'
                type='button'
                onClick={() => dropdown.choose(option.value)}
              >
                <span className={s.choiceLabel}>{option.label}</span>
                {option.hint && <span className={s.choiceHint}>{option.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
