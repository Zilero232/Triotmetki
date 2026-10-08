'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, DataSourceNote, PageHero } from '@/ui-kit';

import { PlayerSearch, PopularPlayers, RecentPlayers } from './components';

import s from './PlayersPage.module.scss';

export const PlayersPage = () => {
  const t = useTranslations('players.head');

  return (
    <div className={s.root}>
      <PageHero
        actions={
          <div className={s.actions}>
            <PlayerSearch />
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.players.compare}>
              {t('compare')}
            </Link>
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.top}>
              {t('top')}
            </Link>
          </div>
        }
        art={{ kind: 'emblem', glyph: <Users size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('title') }]}
        lead={t('description')}
        title={t('title')}
      />
      <div className={s.content}>
        <RecentPlayers />
        <PopularPlayers />
        <DataSourceNote />
      </div>
    </div>
  );
};
