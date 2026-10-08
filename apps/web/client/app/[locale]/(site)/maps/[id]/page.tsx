import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { mapRouteEntity, mapSlugs } from '@/entities/map/map/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata, ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { RequestTime } from '@/shared/seo/request-time';
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { RouteGuard } from '@/shared/seo/route-guard';
import { PageHeaderFallback } from '@/ui-kit';
import { MapPage } from '@/views/map';
import { mapPageState } from '@/views/map/server';

export const generateStaticParams = async () => (await mapSlugs({ fallback: ROUTE_STATIC_PARAMS.fallback.map })).map((id) => ({ id }));

export const generateMetadata = async ({ params }: PageProps<'/[locale]/maps/[id]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const id = decodeRouteParam((await params).id);
  const t = await getTranslations({ locale, namespace: 'maps.mapMeta' });
  const { name, key } = await requireRouteEntity(mapRouteEntity(id));

  return createPageMetadata({
    title: t('title', { name }),
    description: t('description', { name }),
    path: ROUTES.maps.detail(key),
    locale,
    index: true,
    follow: true
  });
};

const MapRoute = async ({ params }: Pick<PageProps<'/[locale]/maps/[id]'>, 'params'>) => (
  <PrefetchBoundary state={mapPageState(decodeRouteParam((await params).id))}>
    <MapPage />
  </PrefetchBoundary>
);

const Page = ({ params }: PageProps<'/[locale]/maps/[id]'>) => (
  <>
    <Suspense>
      <RouteGuard entity={params.then(({ id }) => mapRouteEntity(decodeRouteParam(id)))} />
    </Suspense>
    <Suspense fallback={<PageHeaderFallback />}>
      <MapRoute params={params} />
    </Suspense>
    <Suspense>
      <RequestTime />
    </Suspense>
  </>
);

export default withMessages({ component: Page, messages: ['maps'] });
