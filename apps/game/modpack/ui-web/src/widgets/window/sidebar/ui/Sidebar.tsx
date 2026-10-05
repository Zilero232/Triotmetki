import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { ScrollArea } from '@/ui-kit';

import type { SidebarProps } from './Sidebar.types';

import { useSidebar } from '../model/hooks';
import { SidebarItem } from './components';

import s from './Sidebar.module.scss';

export const Sidebar = ({ compact }: SidebarProps) => {
  const t = useT();
  const sidebar = useSidebar();

  return (
    <nav aria-label={t('navLabel')} className={clsx(s.sidebar, compact && s.compact)}>
      <ScrollArea contentClassName={s.scroll}>
        {!compact && <span className={s.heading}>{t('navComponents')}</span>}
        {sidebar.components.map((item) => (
          <SidebarItem key={item.section} compact={compact} item={item} />
        ))}
        <span className={s.divider} />
        {!compact && <span className={s.heading}>{t('navTools')}</span>}
        {sidebar.tools.map((item) => (
          <SidebarItem key={item.section} compact={compact} item={item} />
        ))}
      </ScrollArea>
      {!compact && <span className={s.hotkey}>{t('hotkeyHint')}</span>}
    </nav>
  );
};
