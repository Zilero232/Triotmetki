'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ROUTES } from '@/shared/constants';
import { Card, CardHeader, DataTable, FilteredEmptyState, LoadMore, QueryState } from '@/ui-kit';

import { useGuideCatalog, useGuideColumns } from '../../../model/hooks';
import { GuideFilters } from '../GuideFilters';

import s from './GuideTable.module.scss';

export const GuideTable = () => {
  const t = useTranslations('guides.list');
  const titleId = useId();
  const { list, total, hasFilters, reset } = useGuideCatalog();

  const columns = useGuideColumns();

  return (
    <Card aria-labelledby={titleId} className={s.root} padding='none'>
      <CardHeader meta={total > 0 ? t('total', { total }) : undefined} title={<span id={titleId}>{t('tableTitle')}</span>} />
      <QueryState
        isCompact
        errorDescription={t('errorDescription')}
        errorTitle={t('errorTitle')}
        query={list.query}
        skeleton={<DataTable isLoading columns={columns} data={[]} toolbar={<GuideFilters />} />}
      >
        {(items) => (
          <DataTable
            emptyState={
              <FilteredEmptyState
                description={hasFilters ? t('emptyFilteredDescription') : t('emptyDescription')}
                isFiltered={hasFilters}
                resetLabel={t('filters.reset')}
                title={t('emptyTitle')}
                onReset={reset}
              />
            }
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
            caption={t('tableTitle')}
            columns={columns}
            data={items}
            getRowId={(row) => row.id}
            getRowLink={(row) => ({ href: ROUTES.guides.detail(row.slug), label: row.title })}
            toolbar={<GuideFilters />}
          />
        )}
      </QueryState>
    </Card>
  );
};
