'use client';

import { useTranslations } from 'next-intl';

import { CompetitionStatusBadge } from '@/entities/competition/competition';
import { ROUTES } from '@/shared/constants';
import { Badge, PageHeader, Skeleton, TextCard } from '@/ui-kit';
import { EventLayout } from '@/widgets/community/event-layout';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { CompetitionPageProps } from './CompetitionPage.types';

import { COMPETITION_PAGE } from '../config';
import { useCompetition } from '../model/hooks';
import { CompetitionSummary, JoinPanel, OwnerPanel, ScoringRules, StandingsTable } from './components';

import s from './CompetitionPage.module.scss';

export const CompetitionPage = ({ slug }: CompetitionPageProps) => {
  const t = useTranslations('competitions');
  const tTournaments = useTranslations('tournaments.head');
  const tTabs = useTranslations('tournaments.tabs');
  const query = useCompetition(slug);

  return (
    <div className={s.root}>
      <ResourceGate
        header={
          <PageHeader
            breadcrumbs={[
              { label: tTournaments('title'), href: ROUTES.tournaments.list },
              { label: tTabs('points'), href: ROUTES.tournaments.points },
              { label: slug }
            ]}
            title={slug}
          />
        }
        skeleton={COMPETITION_PAGE.skeletonHeights.map((height) => (
          <Skeleton key={height} height={height} />
        ))}
        back={{ href: ROUTES.tournaments.points, label: t('page.back') }}
        error={{ title: t('page.errorTitle'), description: t('page.errorDescription') }}
        notFound={{ title: t('page.notFoundTitle'), description: t('page.notFoundDescription') }}
        query={query}
      >
        {(competition) => (
          <>
            <PageHeader
              breadcrumbs={[
                { label: tTournaments('title'), href: ROUTES.tournaments.list },
                { label: tTabs('points'), href: ROUTES.tournaments.points },
                { label: competition.title }
              ]}
              meta={
                <>
                  <CompetitionStatusBadge status={competition.status} />
                  {competition.visibility === 'private' && <Badge tone='premium'>{t('visibility.private')}</Badge>}
                </>
              }
              title={competition.title}
            />
            <CompetitionSummary competition={competition} />
            <OwnerPanel competition={competition} />
            <EventLayout
              aside={
                <>
                  <JoinPanel competition={competition} />
                  <ScoringRules competition={competition} />
                </>
              }
              main={
                <>
                  {competition.description && <TextCard title={t('page.about')}>{competition.description}</TextCard>}
                  <StandingsTable competition={competition} />
                </>
              }
            />
          </>
        )}
      </ResourceGate>
    </div>
  );
};
