'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ROUTES } from '@/shared/constants';
import { Card, CardHeader, DataTable, EmptyState, QueryState } from '@/ui-kit';

import { usePopularColumns, usePopularPlayers } from '../../../model/hooks';

export const PopularPlayers = () => {
  const t = useTranslations('players.popular');
  const titleId = useId();
  const { query, days } = usePopularPlayers();
  const columns = usePopularColumns();

  return (
    <Card aria-labelledby={titleId} padding='none'>
      <CardHeader meta={t('description', { days })} title={<span id={titleId}>{t('title')}</span>} titleAs='h2' />
      <QueryState
        isCompact
        errorTitle={t('errorTitle')}
        query={query}
        skeleton={<DataTable isLoading columns={columns} data={[]} density='compact' />}
      >
        {({ items }) => (
          <DataTable
            caption={t('title')}
            columns={columns}
            data={items}
            density='compact'
            emptyState={<EmptyState isCompact title={t('emptyTitle')} />}
            getRowId={(row) => String(row.accountId)}
            getRowLink={(row) => ({ href: ROUTES.players.profile(row.nickname), label: row.nickname, hasCellLink: true })}
          />
        )}
      </QueryState>
    </Card>
  );
};
