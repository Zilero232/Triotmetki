'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHeader } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { StreamerPageProps } from './StreamerPage.types';

import { useStreamerPage } from '../model/hooks';
import { ClaimBanner, LatestVideos, LiveBlock, StreamerHero, StreamerProvider, StreamerSkeleton, StreamerStats } from './components';

import s from './StreamerPage.module.scss';

export const StreamerPage = ({ slug }: StreamerPageProps) => {
  const t = useTranslations('streamer.page');
  const tNav = useTranslations('nav.items');
  const query = useStreamerPage(slug);

  return (
    <div className={s.root}>
      <ResourceGate
        error={{ title: t('errorTitle'), description: t('errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('streamers'), href: ROUTES.streamers.list }, { label: slug }]} title={slug} />}
        query={query}
        skeleton={<StreamerSkeleton />}
      >
        {(profile) => (
          <StreamerProvider profile={profile}>
            <StreamerHero />
            {profile.kind === 'editorial' && <ClaimBanner />}
            {profile.live && <LiveBlock live={profile.live} />}
            {profile.accountId !== null && <StreamerStats accountId={profile.accountId} />}
            {profile.latestVideos.length > 0 && <LatestVideos videos={profile.latestVideos} />}
          </StreamerProvider>
        )}
      </ResourceGate>
    </div>
  );
};
