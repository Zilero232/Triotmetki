'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { winRateTone } from '@/entities/player/stats';
import { ROUTES } from '@/shared/constants';
import { EmptyState, KeyFigure, KeyFigures, PageHeader, QueryState, Skeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { PlayerWrappedPageProps } from './PlayerWrappedPage.types';

import { WRAPPED_VIEW } from '../config';
import { usePlayerWrapped } from '../model/hooks';
import { WrappedChapters, WrappedOutro } from './components';

import s from './PlayerWrappedPage.module.scss';

export const PlayerWrappedPage = ({ nickname: requested, year }: PlayerWrappedPageProps) => {
  const t = useTranslations('wrapped');
  const tPlayers = useTranslations('players.head');
  const { profile, wrapped, nickname, share, chapters, topTanks, bestVehicle, years } = usePlayerWrapped({ nickname: requested, year });

  return (
    <div className={s.root}>
      <div className={s.head}>
        <PageHeader
          breadcrumbs={[
            { label: tPlayers('title'), href: ROUTES.players.list },
            { label: nickname, href: ROUTES.players.profile(nickname) },
            { label: t('crumb', { year }) }
          ]}
          description={t('lead', { nickname, year })}
          emblem={<CalendarDays />}
          title={t('title', { nickname, year })}
        >
          {wrapped.data && wrapped.data.battles > 0 && (
            <KeyFigures>
              <KeyFigure label={t('figures.battles')} value={wrapped.data.battles} variant='compact' />
              <KeyFigure
                format={{ style: 'percent', maximumFractionDigits: 2 }}
                label={t('figures.winRate')}
                tone={winRateTone(wrapped.data.winRate === null ? null : wrapped.data.winRate * WRAPPED_VIEW.percentScale)}
                value={wrapped.data.winRate}
                variant='compact'
              />
              <KeyFigure
                format={{ maximumFractionDigits: 0 }}
                label={t('figures.avgDamage')}
                tone='battle'
                value={wrapped.data.avgDamage}
                variant='compact'
              />
            </KeyFigures>
          )}
        </PageHeader>
      </div>
      <ResourceGate
        error={{ title: t('missing.errorTitle') }}
        notFound={{ title: t('missing.notFound', { nickname }) }}
        query={profile}
        skeleton={<Skeleton className={s.skeleton} height={WRAPPED_VIEW.skeletonHeight} shape='block' />}
      >
        <QueryState
          empty={<EmptyState className={s.empty} description={t('empty.description', { year })} title={t('empty.title', { year })} />}
          errorDescription={t('error.description')}
          errorTitle={t('error.title')}
          isEmpty={(data) => data.battles === 0}
          query={wrapped}
          skeleton={<Skeleton className={s.skeleton} height={WRAPPED_VIEW.skeletonHeight} shape='block' />}
        >
          {(data) => <WrappedChapters bestVehicle={bestVehicle} chapters={chapters} topTanks={topTanks} wrapped={data} />}
        </QueryState>
        <WrappedOutro copied={share.copied} nickname={nickname} years={years} onCopy={share.onCopy} onShare={share.onShare} />
      </ResourceGate>
    </div>
  );
};
