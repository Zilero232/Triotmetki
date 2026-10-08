'use client';

import { useTranslations } from 'next-intl';

import { EmptyState, QueryState, Skeleton } from '@/ui-kit';
import { SessionDetail } from '@/widgets/player/session-detail';

import { SESSIONS } from '../../../config';
import { useSessionsTab } from '../../../model/hooks';
import { SessionList } from './components';

import s from './SessionsTab.module.scss';

export const SessionsTab = () => {
  const t = useTranslations('profile.sessions');
  const { accountId, nickname, query, detailRef, selectedId, select, showMore } = useSessionsTab();

  return (
    <QueryState
      skeleton={
        <div className={s.root}>
          <Skeleton className={s.listSkeleton} height={SESSIONS.skeletonHeight} shape='block' />
        </div>
      }
      empty={<EmptyState title={t('empty')} />}
      errorDescription={t('listErrorDescription')}
      errorTitle={t('listErrorTitle')}
      isEmpty={({ items }) => items.length === 0}
      query={query}
    >
      {({ items, total }) => (
        <div className={s.root}>
          <SessionList
            hasMore={total > items.length}
            isFetching={query.isFetching}
            items={items}
            selectedId={selectedId}
            onMore={showMore}
            onSelect={select}
          />
          <div ref={detailRef} className={s.detail}>
            {selectedId && <SessionDetail accountId={accountId} nickname={nickname} sessionId={selectedId} />}
          </div>
        </div>
      )}
    </QueryState>
  );
};
