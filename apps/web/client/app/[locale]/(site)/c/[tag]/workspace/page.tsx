import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { clanRouteEntity } from '@/entities/clan/clan/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { PageHeaderFallback } from '@/ui-kit';
import { ClanWorkspacePage } from '@/views/clan-workspace';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/c/[tag]/workspace'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const tag = decodeRouteParam((await params).tag);
  const t = await getTranslations({ locale, namespace: 'clanWorkspace.meta' });
  const { name } = await requireRouteEntity(clanRouteEntity(tag));

  return createPageMetadata({
    title: t('title', { name }),
    description: t('description', { name }),
    path: ROUTES.clans.workspace(tag),
    locale,
    index: false,
    follow: false
  });
};

const WorkspaceRoute = async ({ params }: Pick<PageProps<'/[locale]/c/[tag]/workspace'>, 'params'>) => {
  const tag = decodeRouteParam((await params).tag);

  return <ClanWorkspacePage tag={tag} />;
};

const Page = ({ params }: PageProps<'/[locale]/c/[tag]/workspace'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <WorkspaceRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['clanWorkspace', 'clans.head', 'clans.roster', 'events', 'players.picker'] });
