import clsx from 'clsx';

import type { SideTabsProps } from './SideTabs.types';

import s from './SideTabs.module.scss';

export const SideTabs = ({ tabs, value, label, onSelect }: SideTabsProps) => (
  <div aria-label={label} className={s.tabs} role='group'>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        aria-pressed={tab.id === value}
        className={clsx(s.tab, tab.id === value && s.tabOn, tab.count === 0 && s.tabEmpty)}
        type='button'
        onClick={() => onSelect(tab.id)}
      >
        <span className={s.label}>{tab.label}</span>
        <span className={clsx(s.count, tab.id === value && s.countOn)}>{tab.count}</span>
      </button>
    ))}
  </div>
);
