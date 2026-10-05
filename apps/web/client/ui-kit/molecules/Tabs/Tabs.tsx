'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { clsx } from 'clsx';
import * as m from 'motion/react-m';
import { useId } from 'react';

import { MOTION_TRANSITION, useActiveTabScroll } from '@/shared/lib';

import type { TabsProps } from './Tabs.types';

import s from './Tabs.module.scss';

export const Tabs = <T extends string>({
  items,
  value,
  defaultValue,
  variant = 'strip',
  aside,
  className,
  panelClassName,
  'aria-label': ariaLabel,
  isKeptMounted = false,
  onValueChange
}: TabsProps<T>) => {
  const listRef = useActiveTabScroll(value);
  const indicatorId = useId();

  return (
    <BaseTabs.Root
      className={clsx(s.root, s[variant], className)}
      data-panels={items.some((item) => item.content !== undefined)}
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={(next: T) => onValueChange?.(next)}
    >
      <div className={s.bar}>
        <BaseTabs.List ref={listRef} aria-label={ariaLabel} className={s.list}>
          {items.map((item) => (
            <BaseTabs.Tab
              key={item.value}
              render={(props, { active }) => (
                <button {...props}>
                  {props.children}
                  {variant === 'sticky' && active && (
                    <m.span aria-hidden className={s.indicator} layoutId={indicatorId} transition={MOTION_TRANSITION.layout} />
                  )}
                </button>
              )}
              className={s.tab}
              value={item.value}
            >
              {item.icon && <span className={s.icon}>{item.icon}</span>}
              {item.label}
              {item.count !== undefined && <span className={s.count}>{item.count}</span>}
            </BaseTabs.Tab>
          ))}
        </BaseTabs.List>
        {aside && <div className={s.aside}>{aside}</div>}
      </div>
      {items.map(
        (item) =>
          item.content !== undefined && (
            <BaseTabs.Panel key={item.value} className={clsx(s.content, panelClassName)} keepMounted={isKeptMounted} value={item.value}>
              {item.content}
            </BaseTabs.Panel>
          )
      )}
    </BaseTabs.Root>
  );
};
