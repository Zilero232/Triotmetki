'use client';

import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { DailyPuzzleShelf } from '@/entities/play/daily-puzzle';
import { CatalogPending } from '@/entities/tank/tank';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, DataSourceNote, ErrorState, Legend, PageHeader } from '@/ui-kit';

import { GUESS_LEGEND } from '../config';
import { GuessGameContext } from '../model/context';
import { useGuessGameState } from '../model/hooks';
import { GuessArena, GuessSkeleton } from './components';

import s from './GuessTankPage.module.scss';

export const GuessTankPage = () => {
  const t = useTranslations('play');
  const tCrumbs = useTranslations('play.hub.crumbs');
  const state = useGuessGameState();

  return (
    <div className={s.root}>
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.play.guessMap}>
            {t('head.otherGame')}
          </Link>
        }
        breadcrumbs={[{ label: tCrumbs('hub'), href: ROUTES.play.hub }, { label: t('head.title') }]}
        description={t('head.description')}
        title={t('head.title')}
      >
        <Legend
          aria-label={t('head.legendLabel')}
          items={GUESS_LEGEND.map(({ verdict, tone }) => ({ key: verdict, tone, label: t(`head.legend.${verdict}`) }))}
        />
      </PageHeader>
      {match(state)
        .with({ kind: 'loading' }, () => <GuessSkeleton />)
        .with({ kind: 'error' }, ({ isRetrying, retry }) => (
          <ErrorState description={t('states.errorDescription')} isRetrying={isRetrying} title={t('states.errorTitle')} onRetry={retry} />
        ))
        .with({ kind: 'unavailable' }, () => <CatalogPending />)
        .with({ kind: 'ready' }, ({ game }) => (
          <GuessGameContext value={game}>
            <GuessArena />
          </GuessGameContext>
        ))
        .exhaustive()}
      <DailyPuzzleShelf current='guessTank' />
      <DataSourceNote />
    </div>
  );
};
