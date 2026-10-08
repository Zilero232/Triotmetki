'use client';

import { RadioIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { MyFollowsStrip } from '@/features/streamer/follow-streamer';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Button, buttonVariants, Card, DataSourceNote, EmptyState, FilteredEmptyState, PageHero, QueryState, Skeleton } from '@/ui-kit';
import { StreamersHubNav } from '@/widgets/streamer/streamers-hub';

import { DIRECTORY } from '../config';
import { useStreamersDirectory } from '../model/hooks';
import { DirectoryFilters, StreamerCard } from './components';

import s from './StreamersDirectoryPage.module.scss';

export const StreamersDirectoryPage = () => {
  const t = useTranslations('streamersDirectory');
  const directory = useStreamersDirectory();

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <RadioIcon size={DIRECTORY.emblemSize} strokeWidth={DIRECTORY.emblemStroke} /> }}
        breadcrumbs={[{ label: t('head.title') }]}
        lead={t('head.description')}
        title={t('head.title')}
      />
      <div className={s.content}>
        <StreamersHubNav />
        <MyFollowsStrip />
        <DirectoryFilters />
        <QueryState
          empty={
            <Card>
              {directory.hasFilters ? (
                <FilteredEmptyState
                  isFiltered
                  description={t('empty.filteredDescription')}
                  title={t('empty.filteredTitle')}
                  onReset={directory.reset}
                />
              ) : (
                <EmptyState
                  action={
                    <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.account.streamer}>
                      {t('empty.action')}
                    </Link>
                  }
                  description={t('empty.description')}
                  title={t('empty.title')}
                />
              )}
            </Card>
          }
          skeleton={
            <div aria-busy className={s.grid}>
              {DIRECTORY.skeletons.map((index) => (
                <Skeleton key={index} height={DIRECTORY.skeletonHeight} shape='block' />
              ))}
            </div>
          }
          errorDescription={t('error.description')}
          errorTitle={t('error.title')}
          isEmpty={() => directory.entries.length === 0}
          query={directory.query}
        >
          <ul className={s.grid}>
            {directory.entries.map((entry) => (
              <StreamerCard key={entry.card.slug} entry={entry} />
            ))}
          </ul>
        </QueryState>
        {directory.query.hasNextPage && (
          <Button className={s.more} disabled={directory.query.isFetchingNextPage} variant='secondary' onClick={directory.loadMore}>
            {t('more')}
          </Button>
        )}
        <DataSourceNote />
      </div>
    </div>
  );
};
