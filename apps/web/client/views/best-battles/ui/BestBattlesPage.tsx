'use client';

import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, DataSourceNote, FilteredEmptyState, KeyFigure, PageHero, PodiumSkeleton, QueryState } from '@/ui-kit';

import { BEST_BATTLES_VIEW } from '../config';
import { useBestBattles } from '../model/hooks';
import { BestBattlesFilters, BestBattlesPodium, BestBattlesTable } from './components';

import s from './BestBattlesPage.module.scss';

export const BestBattlesPage = () => {
  const t = useTranslations('bestBattles');
  const view = useBestBattles();

  return (
    <div className={s.root}>
      <PageHero
        figures={
          view.isFacetsPending ? (
            <KeyFigure label={t('hero.topDamage')} value={null} variant='compact' />
          ) : (
            view.facets && (
              <>
                <KeyFigure label={t(`hero.battles.${view.facets.period}`)} value={view.facets.battles} variant='compact' />
                {view.facets.topDamage !== null && <KeyFigure label={t('hero.topDamage')} value={view.facets.topDamage} variant='compact' />}
              </>
            )
          )
        }
        art={{ kind: 'emblem', glyph: <Trophy size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('hero.title') }]}
        lead={t('hero.lead')}
        title={t('hero.title')}
      />
      <div className={s.content}>
        {view.feed.isPending && <PodiumSkeleton count={BEST_BATTLES_VIEW.podiumSize} {...BEST_BATTLES_VIEW.podiumSkeleton} />}
        {view.podium.length > 0 && (
          <div className={s.board} data-refreshing={view.feed.isPlaceholderData}>
            <BestBattlesPodium battles={view.podium} metric={view.metric} />
          </div>
        )}
        <Card padding='none'>
          <BestBattlesFilters />
          <div className={s.body}>
            <QueryState
              isCompact
              errorDescription={t('error.description')}
              errorTitle={t('error.title')}
              query={view.feed}
              skeleton={<BestBattlesTable isLoading battles={[]} metric={view.metric} />}
            >
              <div className={s.board} data-refreshing={view.feed.isPlaceholderData}>
                <BestBattlesTable
                  emptyState={
                    <FilteredEmptyState
                      isCompact
                      description={view.isFiltered ? t('empty.filtered') : t('empty.description')}
                      isFiltered={view.isFiltered}
                      title={t('empty.title')}
                      onReset={view.reset}
                    />
                  }
                  battles={view.battles}
                  hasNextPage={view.feed.hasNextPage}
                  isFetchingNextPage={view.feed.isFetchingNextPage}
                  metric={view.metric}
                  onLoadMore={view.loadMore}
                />
              </div>
            </QueryState>
          </div>
        </Card>
        <DataSourceNote />
      </div>
    </div>
  );
};
