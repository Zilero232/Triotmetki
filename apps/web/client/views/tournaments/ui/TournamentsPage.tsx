'use client';

import { useTranslations } from 'next-intl';

import { PageHeader, Tabs } from '@/ui-kit';

import type { TournamentsPageProps } from './TournamentsPage.types';

import { useTournamentsTab } from '../model/hooks';
import { CreateTournamentDialog, TournamentList } from './components';

import s from './TournamentsPage.module.scss';

export const TournamentsPage = ({ points, pointsAction }: TournamentsPageProps) => {
  const t = useTranslations('tournaments');
  const { tab, onTabChange } = useTournamentsTab();

  return (
    <div className={s.root}>
      <PageHeader
        actions={tab === 'points' ? pointsAction : <CreateTournamentDialog />}
        breadcrumbs={[{ label: t('head.title') }]}
        description={t('head.description')}
        title={t('head.title')}
      />
      <Tabs
        items={[
          { value: 'bracket', label: t('tabs.bracket'), content: <TournamentList /> },
          { value: 'points', label: t('tabs.points'), content: points }
        ]}
        value={tab}
        variant='strip'
        onValueChange={onTabChange}
      />
    </div>
  );
};
