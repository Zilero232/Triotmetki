'use client';

import { Newspaper } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TankPicker } from '@/features/tank/pick-tank';
import { Button, Card, DataSourceNote, FilteredEmptyState, PageHeader, QueryState, SegmentedControl } from '@/ui-kit';
import { LeadFeed, LeadFeedSkeleton } from '@/widgets/content/lead-feed';

import { NEWS } from '../config';
import { useNewsFeed } from '../model/hooks';
import { NewsCard } from './components';

import s from './NewsPage.module.scss';

export const NewsPage = () => {
  const t = useTranslations('news');
  const feed = useNewsFeed();

  return (
    <div className={s.root}>
      <PageHeader breadcrumbs={[{ label: t('head.title') }]} description={t('head.description')} emblem={<Newspaper />} title={t('head.title')} />
      <div className={s.controls}>
        <SegmentedControl
          aria-label={t('filters.label')}
          className={s.filters}
          options={NEWS.filters.map((value) => ({ value, label: t(`filters.${value}`) }))}
          value={feed.kind}
          onChange={feed.setKind}
        />
        <div className={s.tank}>
          <TankPicker className={s.picker} placeholder={t('filters.tank')} value={feed.vehicle} onChange={feed.setVehicle} />
          {feed.isTankFiltered && (
            <Button size='sm' variant='ghost' onClick={feed.clearVehicle}>
              {t('filters.clearTank')}
            </Button>
          )}
        </div>
      </div>
      <QueryState
        empty={
          <Card>
            <FilteredEmptyState
              description={feed.isTankFiltered ? t('emptyTank.description') : t('empty.description')}
              isFiltered={feed.isTankFiltered}
              resetLabel={t('filters.clearTank')}
              title={feed.isTankFiltered ? t('emptyTank.title') : t('empty.title')}
              onReset={feed.clearVehicle}
            />
          </Card>
        }
        errorDescription={t('error.description')}
        errorTitle={t('error.title')}
        isEmpty={() => feed.entries.length === 0}
        query={feed.query}
        skeleton={<LeadFeedSkeleton count={NEWS.skeletons} height={NEWS.skeletonHeight} />}
      >
        <LeadFeed
          itemKey={(entry) => entry.item.id}
          items={feed.rest}
          lead={feed.lead && <NewsCard isPriority entry={feed.lead} variant='lead' />}
          renderItem={(entry) => <NewsCard entry={entry} />}
        />
      </QueryState>
      {feed.query.hasNextPage && (
        <Button className={s.more} disabled={feed.query.isFetchingNextPage} variant='secondary' onClick={feed.loadMore}>
          {t('more', { shown: feed.entries.length, total: feed.total })}
        </Button>
      )}
      <DataSourceNote />
    </div>
  );
};
