import { OtmetkiLogoIcon } from '@otmetki/icons';
import { useTranslations } from 'use-intl';

import { AutostartPrompt } from '@/features/settings/autostart-prompt';
import { Tooltip } from '@/ui-kit';

import type { AppShellProps } from './AppShell.types';

import { useAppShell } from '../model/hooks';
import { StatusDock } from './components';

import s from './AppShell.module.scss';

export const AppShell = ({ children }: AppShellProps) => {
  const t = useTranslations();
  const { mainRef, groups, onNavKeyDown } = useAppShell();

  return (
    <div className={s.root}>
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <OtmetkiLogoIcon aria-hidden className={s.logo} size={30} />
          <div className={s.brandText}>
            <span className={s.name}>{t('common.appName')}</span>
            <span className={s.subtitle}>{t('common.appSubtitle')}</span>
          </div>
        </div>
        <nav aria-label={t('nav.label')} className={s.nav}>
          {groups.map((group) => (
            <div key={group.id} aria-label={group.label} className={s.group} data-pinned={group.isPinned || undefined} role='group'>
              {group.isLabelShown && (
                <span aria-hidden className={s.groupLabel}>
                  {group.label}
                </span>
              )}
              {group.items.map(({ id, label, ariaShortcut, hint, icon: Icon, isActive, marker, markerLabel, onSelect }) => (
                <Tooltip key={id} content={hint} side='right'>
                  <button
                    data-nav-item
                    aria-current={isActive ? 'page' : undefined}
                    aria-keyshortcuts={ariaShortcut}
                    className={s.navItem}
                    type='button'
                    onClick={onSelect}
                    onKeyDown={onNavKeyDown}
                  >
                    <Icon aria-hidden />
                    <span className={s.navLabel}>{label}</span>
                    {marker && (
                      <span className={s.marker} data-marker={marker.kind}>
                        <span aria-hidden className={s.markerCount}>
                          {marker.count ?? '!'}
                        </span>
                        <span className={s.srOnly}>{markerLabel}</span>
                      </span>
                    )}
                  </button>
                </Tooltip>
              ))}
            </div>
          ))}
        </nav>
        <StatusDock />
      </aside>
      <main ref={mainRef} className={s.main}>
        <div className={s.content}>{children}</div>
      </main>
      <AutostartPrompt />
    </div>
  );
};
