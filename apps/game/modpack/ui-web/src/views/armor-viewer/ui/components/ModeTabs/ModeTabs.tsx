import clsx from 'clsx';

import type { ModeTabsProps } from './ModeTabs.types';

import s from './ModeTabs.module.scss';

export const ModeTabs = ({ modes, label, onSelect }: ModeTabsProps) => (
  <div aria-label={label} className={s.tabs} role='group'>
    {modes.map((mode) => (
      <button
        key={mode.id}
        aria-pressed={mode.active}
        className={clsx(s.tab, mode.active && s.tabOn)}
        type='button'
        onClick={() => onSelect(mode.id)}
      >
        {mode.label}
      </button>
    ))}
  </div>
);
