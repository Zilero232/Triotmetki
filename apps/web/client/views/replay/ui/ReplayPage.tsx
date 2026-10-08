'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHeader, PageHeaderSkeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { ReplayPageProps } from './ReplayPage.types';

import { useReplayPage } from '../model/hooks';
import { ReplayHeatmap, ReplayOverview, ReplayProvider, ReplayScoreboard, ReplaySkeleton, ReplayStatusState, ReplayTimeline } from './components';

import s from './ReplayPage.module.scss';

export const ReplayPage = ({ id }: ReplayPageProps) => {
  const t = useTranslations('replays.detail');
  const tNav = useTranslations('nav.items');
  const query = useReplayPage(id);

  return (
    <div className={s.root}>
      <ResourceGate
        skeleton={
          <>
            <PageHeaderSkeleton hasDescription={false} />
            <ReplaySkeleton />
          </>
        }
        error={{ title: t('errorTitle'), description: t('errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('replays'), href: ROUTES.replays.list }]} title={tNav('replays')} />}
        query={query}
      >
        {(replay) => (
          <ReplayProvider replay={replay}>
            {replay.status === 'parsed' ? (
              <>
                <ReplayOverview />
                <ReplayScoreboard />
                <div className={s.grid}>
                  <ReplayTimeline />
                  <ReplayHeatmap />
                </div>
              </>
            ) : (
              <ReplayStatusState />
            )}
          </ReplayProvider>
        )}
      </ResourceGate>
    </div>
  );
};
