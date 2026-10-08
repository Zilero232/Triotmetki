'use client';

import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { DailyPuzzleShelf } from '@/entities/play/daily-puzzle';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, DataSourceNote, EmptyState, ErrorState, PageHeader } from '@/ui-kit';

import { GuessMapContext } from '../model/context';
import { useGuessMapState } from '../model/hooks';
import { MapArena, MapSkeleton } from './components';

import s from './GuessMapPage.module.scss';

export const GuessMapPage = () => {
  const t = useTranslations('play.map');
  const tCrumbs = useTranslations('play.hub.crumbs');
  const state = useGuessMapState();

  return (
    <div className={s.root}>
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.play.guessTank}>
            {t('head.otherGame')}
          </Link>
        }
        breadcrumbs={[{ label: tCrumbs('hub'), href: ROUTES.play.hub }, { label: t('head.title') }]}
        description={t('head.description')}
        title={t('head.title')}
      />
      {match(state)
        .with({ kind: 'loading' }, () => <MapSkeleton />)
        .with({ kind: 'error' }, ({ isRetrying, retry }) => (
          <ErrorState description={t('states.errorDescription')} isRetrying={isRetrying} title={t('states.errorTitle')} onRetry={retry} />
        ))
        .with({ kind: 'unavailable' }, () => <EmptyState description={t('states.unavailableDescription')} title={t('states.unavailableTitle')} />)
        .with({ kind: 'ready' }, ({ game }) => (
          <GuessMapContext value={game}>
            <MapArena />
          </GuessMapContext>
        ))
        .exhaustive()}
      <DailyPuzzleShelf current='guessMap' />
      <DataSourceNote />
    </div>
  );
};
