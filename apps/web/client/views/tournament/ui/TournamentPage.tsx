'use client';

import { useTranslations } from 'next-intl';

import { TournamentStatusBadge } from '@/features/community/tournament-status';
import { ROUTES } from '@/shared/constants';
import { PageHeader, Skeleton, TextCard } from '@/ui-kit';
import { EventLayout } from '@/widgets/community/event-layout';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { TournamentPageProps } from './TournamentPage.types';

import { TOURNAMENT_PAGE } from '../config';
import { useTournament } from '../model/hooks';
import { OrganizerPanel, ParticipantsTable, RegistrationPanel, TournamentBracket, TournamentSummary } from './components';

import s from './TournamentPage.module.scss';

export const TournamentPage = ({ slug }: TournamentPageProps) => {
  const t = useTranslations('tournaments');
  const tNav = useTranslations('nav.items');
  const query = useTournament(slug);

  return (
    <div className={s.root}>
      <ResourceGate
        skeleton={TOURNAMENT_PAGE.skeletonHeights.map((height) => (
          <Skeleton key={height} height={height} />
        ))}
        back={{ href: ROUTES.tournaments.list, label: t('page.back') }}
        error={{ title: t('page.errorTitle'), description: t('page.errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('tournaments'), href: ROUTES.tournaments.list }, { label: slug }]} title={slug} />}
        notFound={{ title: t('page.notFoundTitle'), description: t('page.notFoundDescription') }}
        query={query}
      >
        {(tournament) => (
          <>
            <PageHeader
              breadcrumbs={[{ label: t('head.title'), href: ROUTES.tournaments.list }, { label: tournament.title }]}
              meta={<TournamentStatusBadge status={tournament.status} />}
              title={tournament.title}
            />
            <TournamentSummary tournament={tournament} />
            <OrganizerPanel tournament={tournament} />
            <EventLayout
              aside={
                <>
                  <RegistrationPanel tournament={tournament} />
                  <ParticipantsTable tournament={tournament} />
                </>
              }
              main={
                <>
                  {tournament.description && <TextCard title={t('page.about')}>{tournament.description}</TextCard>}
                  <TournamentBracket tournament={tournament} />
                </>
              }
            />
          </>
        )}
      </ResourceGate>
    </div>
  );
};
