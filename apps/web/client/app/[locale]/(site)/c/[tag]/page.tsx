import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { clanRouteEntity, topClanTags } from '@/entities/clan/clan/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata, ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { clanJsonLd } from '@/shared/seo/json-ld';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { RequestTime } from '@/shared/seo/request-time';
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { RouteGuard } from '@/shared/seo/route-guard';
import { PageHeaderFallback } from '@/ui-kit';
import { ClanPage } from '@/views/clan';
import { clanPageState } from '@/views/clan/server';

export const generateStaticParams = async () => (await topClanTags({ fallback: ROUTE_STATIC_PARAMS.fallback.clan })).map((tag) => ({ tag }));

export const generateMetadata = async ({ params }: PageProps<'/[locale]/c/[tag]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const tag = decodeRouteParam((await params).tag);
  const t = await getTranslations({ locale, namespace: 'clans.clanMeta' });
  const { name, key } = await requireRouteEntity(clanRouteEntity(tag));

  return createPageMetadata({
    title: t('title', { name }),
    description: t('description', { name }),
    path: ROUTES.clans.detail(key),
    locale,
    index: true,
    follow: true,
    hasOwnImage: true
  });
};

const ClanRoute = async ({ params }: Pick<PageProps<'/[locale]/c/[tag]'>, 'params'>) => (
  <PrefetchBoundary state={clanPageState(decodeRouteParam((await params).tag))}>
    <ClanPage />
  </PrefetchBoundary>
);

const Page = ({ params }: PageProps<'/[locale]/c/[tag]'>) => {
  const tag = params.then(({ tag: raw }) => decodeRouteParam(raw));

  return (
    <>
      <Suspense>
        <RouteGuard
          entity={tag.then(clanRouteEntity)}
          schema={async ({ name, key }) => clanJsonLd({ name, path: ROUTES.clans.detail(key), locale: resolveLocale(await rootParams.locale()) })}
        />
      </Suspense>
      <Suspense fallback={<PageHeaderFallback />}>
        <ClanRoute params={params} />
      </Suspense>
      <Suspense>
        <RequestTime />
      </Suspense>
    </>
  );
};

export default withMessages({ component: Page, messages: ['clans', 'events.roleChange', 'events.unknownPlayer'] });
