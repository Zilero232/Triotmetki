'use client';

import { useBoolean } from '@siberiacancode/reactuse';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { InboxBell } from '@/features/notifications/inbox-bell';
import { CommandPaletteTrigger } from '@/features/search/command-palette';
import { SITE_NAV } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { IconButton, Skeleton } from '@/ui-kit';

import { AccountMenu, MobileNav, SiteBrand, SiteNav, UtilityBar } from './components';

import s from './SiteHeader.module.scss';

export const SiteHeader = () => {
  const t = useTranslations('nav');
  const [isMenuOpen, toggleMenu] = useBoolean(false);

  return (
    <>
      <UtilityBar />
      <header className={s.root}>
        <div className={s.inner}>
          <SiteBrand />
          <Suspense fallback={<span className={s.nav} />}>
            <SiteNav className={s.nav} />
          </Suspense>
          <div className={s.actions}>
            <CommandPaletteTrigger className={s.searchBar} />
            <CommandPaletteTrigger className={s.searchIcon} variant='icon' />
            <InboxBell />
            <Link className={s.plus} href={SITE_NAV.plus.href}>
              <SITE_NAV.plus.icon aria-hidden size={15} />
              <span className={s.plusLabel}>{t(`items.${SITE_NAV.plus.key}`)}</span>
            </Link>
            <Suspense fallback={<Skeleton height={28} shape='block' width={44} />}>
              <AccountMenu />
            </Suspense>
            <IconButton aria-label={t('menu')} className={s.burger} onClick={() => toggleMenu(true)}>
              <Menu size={20} />
            </IconButton>
          </div>
        </div>
        <Suspense>
          <MobileNav open={isMenuOpen} onOpenChange={toggleMenu} />
        </Suspense>
      </header>
    </>
  );
};
