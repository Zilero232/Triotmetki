'use client';

import { UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { Avatar, buttonVariants } from '@/ui-kit';

import type { MeDashboardProps } from './MeDashboard.types';

import { useMeDashboard } from '../../../model/hooks';
import { BotsCard } from '../BotsCard';
import { DataExportCard } from '../DataExportCard';
import { DeleteAccountCard } from '../DeleteAccountCard';
import { FavoritesCard } from '../FavoritesCard';
import { GoalsCard } from '../GoalsCard';
import { LinkedAccountsCard } from '../LinkedAccountsCard';
import { ModBindCard } from '../ModBindCard';
import { NotificationsCard } from '../NotificationsCard';

import s from './MeDashboard.module.scss';

export const MeDashboard = ({ name }: MeDashboardProps) => {
  const t = useTranslations('me');
  const { profileHref } = useMeDashboard();

  return (
    <div className={s.root}>
      <header className={s.header}>
        <Avatar name={name} size='lg' />
        <div className={s.greeting}>
          <span className={s.eyebrow}>{t('eyebrow')}</span>
          <h1 className={s.title}>{t('title', { name })}</h1>
        </div>
        {profileHref && (
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={profileHref}>
            <UserRound aria-hidden size={15} />
            {t('publicProfile')}
          </Link>
        )}
      </header>
      <div className={s.grid}>
        <div className={s.wide}>
          <GoalsCard />
        </div>
        <div>
          <FavoritesCard />
        </div>
        <div>
          <LinkedAccountsCard />
        </div>
        <div>
          <BotsCard />
        </div>
        <div>
          <ModBindCard />
        </div>
        <div>
          <NotificationsCard />
        </div>
        <div>
          <DataExportCard />
        </div>
        <div className={s.wide}>
          <DeleteAccountCard />
        </div>
      </div>
    </div>
  );
};
