'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { useRouteParam } from '@/shared/lib';
import { DataSourceNote, PageHeader, Tabs } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import { useClanPage } from '../model/hooks';
import { ClanBases, ClanEvents, ClanHeader, ClanRoster, ClanSkeleton } from './components';

import s from './ClanPage.module.scss';

export const ClanPage = () => {
  const t = useTranslations('clans');
  const tNav = useTranslations('nav.items');
  const clanTag = useRouteParam('tag');
  const query = useClanPage(clanTag);

  return (
    <div className={s.root}>
      <ResourceGate
        back={{ href: ROUTES.clans.list, label: t('missing.toClans') }}
        error={{ title: t('missing.errorTitle'), description: t('missing.errorDescription', { tag: clanTag }) }}
        header={<PageHeader breadcrumbs={[{ label: tNav('clans'), href: ROUTES.clans.list }, { label: `[${clanTag}]` }]} title={`[${clanTag}]`} />}
        notFound={{ title: t('missing.notFoundTitle'), description: t('missing.notFoundDescription', { tag: clanTag }) }}
        query={query}
        skeleton={<ClanSkeleton />}
      >
        {(page) => (
          <>
            <ClanHeader page={page} />
            <Tabs
              items={[
                {
                  value: 'roster',
                  label: t('tabs.roster'),
                  count: page.members.length,
                  content: <ClanRoster members={page.members} now={page.updatedAt} />
                },
                { value: 'stronghold', label: t('tabs.stronghold'), content: <ClanBases clanId={page.clan.clanId} view='stronghold' /> },
                { value: 'globalMap', label: t('tabs.globalMap'), content: <ClanBases clanId={page.clan.clanId} view='globalMap' /> },
                { value: 'history', label: t('tabs.history'), content: <ClanEvents clanId={page.clan.clanId} now={page.updatedAt} /> }
              ]}
              variant='panel'
            />
            <DataSourceNote updatedAt={page.updatedAt} />
          </>
        )}
      </ResourceGate>
    </div>
  );
};
