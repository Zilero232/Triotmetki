'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';

import type { TanksHubNavProps } from './TanksHubNav.types';

import { TANKS_HUB_NAV, TANKS_HUB_TABS } from '../config';

import s from './TanksHubNav.module.scss';

export const TanksHubNav = ({ current }: TanksHubNavProps) => {
  const t = useTranslations('nav.tanksHub');

  return (
    <nav aria-label={t('label')} className={s.root}>
      {TANKS_HUB_TABS.map(({ key, href, icon: Icon }) => (
        <Link key={key} aria-current={key === current ? 'page' : undefined} className={s.link} data-active={key === current} href={href}>
          <Icon aria-hidden className={s.icon} size={TANKS_HUB_NAV.iconSize} />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
};
