'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHeader, Skeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { ClanWorkspacePageProps } from './ClanWorkspacePage.types';

import { WORKSPACE_VIEW } from '../config';
import { useClanWorkspace } from '../model/hooks';
import { WorkspaceNotice, WorkspaceTabs } from './components';

import s from './ClanWorkspacePage.module.scss';

export const ClanWorkspacePage = ({ tag }: ClanWorkspacePageProps) => {
  const t = useTranslations('clanWorkspace');
  const tClans = useTranslations('clans.head');
  const { clan, workspace, status, isOfficer, recruits, canCreate, isCreating, isRetrying, loginHref, tab, onTabChange, onCreate, onRetry } =
    useClanWorkspace(tag);

  return (
    <div className={s.root}>
      <ResourceGate
        header={
          <PageHeader
            breadcrumbs={[
              { label: tClans('title'), href: ROUTES.clans.list },
              { label: `[${tag}]`, href: ROUTES.clans.detail(tag) },
              { label: t('crumb') }
            ]}
            title={t('title')}
          />
        }
        back={{ href: ROUTES.clans.list, label: t('missingClan.back') }}
        error={{ title: t('missingClan.errorTitle') }}
        notFound={{ title: t('missingClan.notFound', { tag }) }}
        query={clan}
        skeleton={<Skeleton height={WORKSPACE_VIEW.skeletonHeight} shape='block' />}
      >
        {(page) => (
          <>
            <PageHeader
              breadcrumbs={[
                { label: tClans('title'), href: ROUTES.clans.list },
                { label: `[${page.clan.tag}]`, href: ROUTES.clans.detail(page.clan.tag) },
                { label: t('crumb') }
              ]}
              description={t('lead')}
              meta={`[${page.clan.tag}] ${page.clan.name}`}
              title={t('title')}
            />
            <div className={s.body}>
              {status === 'ready' ? (
                workspace && (
                  <WorkspaceTabs
                    clanId={page.clan.clanId}
                    isOfficer={isOfficer}
                    members={page.members}
                    recruits={recruits}
                    tab={tab}
                    workspace={workspace}
                    onTabChange={onTabChange}
                  />
                )
              ) : (
                <WorkspaceNotice
                  canCreate={canCreate}
                  clanTag={page.clan.tag}
                  isCreating={isCreating}
                  isRetrying={isRetrying}
                  loginHref={loginHref}
                  status={status}
                  onCreate={onCreate}
                  onRetry={onRetry}
                />
              )}
            </div>
          </>
        )}
      </ResourceGate>
    </div>
  );
};
