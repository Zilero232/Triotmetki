'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { DataSourceNote, PageHeader } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { PlayerProfilePageProps } from './PlayerProfilePage.types';

import { useProfilePage } from '../model/hooks';
import { OfficialRatingsCard, ProfileActionStrip, ProfileHeader, ProfileProvider, ProfileSkeleton, ProfileTabs } from './components';

import s from './PlayerProfilePage.module.scss';

export const PlayerProfilePage = ({ nickname }: PlayerProfilePageProps) => {
  const t = useTranslations('profile.missing');
  const tNav = useTranslations('nav.items');
  const query = useProfilePage(nickname);

  return (
    <div className={s.root}>
      <ResourceGate
        back={{ href: ROUTES.players.list, label: t('search') }}
        className={s.body}
        error={{ title: t('errorTitle'), description: t('errorDescription', { nickname }) }}
        header={<PageHeader breadcrumbs={[{ label: tNav('players'), href: ROUTES.players.list }, { label: nickname }]} title={nickname} />}
        notFound={{ title: t('notFoundTitle'), description: t('notFoundDescription', { nickname }) }}
        query={query}
        skeleton={<ProfileSkeleton />}
        skeletonClassName={s.gate}
      >
        {(profile) => (
          <ProfileProvider profile={profile}>
            <ProfileHeader />
            <ProfileActionStrip />
            <div className={s.body}>
              <OfficialRatingsCard />
              <ProfileTabs />
              <DataSourceNote updatedAt={profile.summary.updatedAt} />
            </div>
          </ProfileProvider>
        )}
      </ResourceGate>
    </div>
  );
};
