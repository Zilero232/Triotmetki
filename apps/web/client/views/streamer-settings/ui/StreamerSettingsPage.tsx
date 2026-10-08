'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { EmptyState, PageHeader, Skeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { StreamerSettingsPageProps } from './StreamerSettingsPage.types';

import { useStreamerSettingsPage } from '../model/hooks';
import { ModsFairPlay, SettingsActions, SettingsGroupPanel, SettingsHistory } from './components';

import s from './StreamerSettingsPage.module.scss';

export const StreamerSettingsPage = ({ slug }: StreamerSettingsPageProps) => {
  const t = useTranslations('streamerSettings.page');
  const tNav = useTranslations('nav.items');
  const format = useFormatter();
  const { query, groups } = useStreamerSettingsPage(slug);

  return (
    <div className={s.root}>
      <ResourceGate
        header={
          <PageHeader
            breadcrumbs={[
              { label: tNav('streamers'), href: ROUTES.streamers.list },
              { label: slug, href: ROUTES.streamers.profile(slug) },
              { label: t('crumbs.current') }
            ]}
            title={t('title', { name: slug })}
          />
        }
        skeleton={
          <>
            <Skeleton height={96} shape='block' />
            <Skeleton height={320} shape='block' />
          </>
        }
        className={s.skeleton}
        error={{ title: t('errorTitle'), description: t('errorDescription') }}
        query={query}
      >
        {(loaded) => (
          <>
            <PageHeader
              breadcrumbs={[
                { label: tNav('streamers'), href: ROUTES.streamers.list },
                { label: loaded.displayName, href: ROUTES.streamers.profile(loaded.slug) },
                { label: t('crumbs.current') }
              ]}
              actions={groups.length > 0 && <SettingsActions view={loaded} />}
              description={t('description')}
              meta={loaded.updatedAt && <span className={s.meta}>{t('updated', { date: format.dateTime(new Date(loaded.updatedAt), 'date') })}</span>}
              title={t('title', { name: loaded.displayName })}
            />
            {groups.length === 0 ? (
              <EmptyState description={t('emptyDescription')} icon={<SlidersHorizontal size={20} />} title={t('emptyTitle')} />
            ) : (
              <div className={s.groups}>
                {groups.map((group) => (
                  <SettingsGroupPanel key={group.group} group={group}>
                    {group.group === 'mods' && <ModsFairPlay />}
                  </SettingsGroupPanel>
                ))}
              </div>
            )}
            <SettingsHistory slug={loaded.slug} />
          </>
        )}
      </ResourceGate>
    </div>
  );
};
