'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ROUTES } from '@/shared/constants';
import { Card, CardHeader, DataTable, FilteredEmptyState, LoadMore, QueryState, Tabs } from '@/ui-kit';

import type { ReplayTab } from './ReplayBrowser.types';

import { REPLAY_TABS } from '../../../config';
import { useReplayBrowser } from '../../../model/hooks/use-replay-browser';
import { ReplayFilters } from '../ReplayFilters';
import { ReplayCard } from './components';

import s from './ReplayBrowser.module.scss';

export const ReplayBrowser = () => {
  const t = useTranslations('replays.list');
  const titleId = useId();
  const { tab, isSignedIn, isMine, list, total, isTotalKnown, isFiltered, empty, columns, vehicleOf, mapNameOf, setTab, resetFilters } =
    useReplayBrowser();

  return (
    <Card aria-labelledby={titleId} className={s.root} padding='none'>
      <CardHeader
        tabs={
          isSignedIn && (
            <Tabs<ReplayTab> items={REPLAY_TABS.map((value) => ({ value, label: t(`tabs.${value}`) }))} value={tab} onValueChange={setTab} />
          )
        }
        meta={isTotalKnown && t('total', { total })}
        title={<span id={titleId}>{t('title')}</span>}
      />
      {!isMine && <ReplayFilters />}
      <QueryState
        isCompact
        skeleton={
          <DataTable
            isLoading
            columns={columns}
            data={[]}
            density='media'
            renderCard={(row) => <ReplayCard replay={row} vehicle={vehicleOf(row)} />}
          />
        }
        empty={<FilteredEmptyState description={t(empty.description)} isFiltered={isFiltered} title={t(empty.title)} onReset={resetFilters} />}
        errorDescription={t('errorDescription')}
        errorTitle={t('errorTitle')}
        isEmpty={(items) => items.length === 0}
        query={list.query}
      >
        {(items) => (
          <DataTable
            footer={
              list.hasMore && (
                <LoadMore
                  className={s.more}
                  hasNextPage={list.hasNextPage}
                  isError={list.isError}
                  isFetchingNextPage={list.isFetchingNextPage}
                  onLoadMore={list.loadMore}
                />
              )
            }
            caption={t('title')}
            columns={columns}
            data={items}
            density='media'
            getRowId={(row) => row.id}
            getRowLink={(row) => ({ href: ROUTES.replays.detail(row.id), label: mapNameOf(row) ?? t('unknownMap') })}
            renderCard={(row) => <ReplayCard replay={row} vehicle={vehicleOf(row)} />}
          />
        )}
      </QueryState>
    </Card>
  );
};
