'use client';

import { CalendarDays, UserRound, Warehouse } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompareToggle } from '@/features/compare/compare-selection';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';

import type { DashboardLinksProps } from './DashboardLinks.types';

import { HOME, HOME_ICON } from '../../../../../config';

import s from './DashboardLinks.module.scss';

export const DashboardLinks = ({ accountId, nickname }: DashboardLinksProps) => {
  const t = useTranslations('home.dashboard.shortcuts');

  return (
    <nav aria-label={t('title')} className={s.root}>
      <h3 className={s.title}>{t('title')}</h3>
      <ul className={s.list}>
        <li>
          <Link className={s.link} href={ROUTES.players.profile(nickname)}>
            <UserRound aria-hidden size={HOME_ICON.dashboard} />
            {t('profile')}
          </Link>
        </li>
        <li>
          <Link className={s.link} href={{ pathname: ROUTES.players.profile(nickname), query: HOME.dashboard.tanksQuery }}>
            <Warehouse aria-hidden size={HOME_ICON.dashboard} />
            {t('tanks')}
          </Link>
        </li>
        <li>
          <Link className={s.link} href={{ pathname: ROUTES.players.profile(nickname), query: HOME.dashboard.sessionsQuery }}>
            <CalendarDays aria-hidden size={HOME_ICON.dashboard} />
            {t('sessions')}
          </Link>
        </li>
      </ul>
      <CompareToggle className={s.compare} entry={{ kind: 'player', item: { accountId, nickname } }} variant='button' />
    </nav>
  );
};
