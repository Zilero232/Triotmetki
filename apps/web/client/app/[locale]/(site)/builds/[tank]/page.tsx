import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { tankRouteEntity, topTankSlugs } from '@/entities/tank/tank/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata, ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { RequestTime } from '@/shared/seo/request-time';
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { RouteGuard } from '@/shared/seo/route-guard';
import { PageHeaderFallback } from '@/ui-kit';
import { BuildPage } from '@/views/build';
import { buildPageState } from '@/views/build/server';

export const generateStaticParams = async () => (await topTankSlugs({ fallback: ROUTE_STATIC_PARAMS.fallback.tank })).map((tank) => ({ tank }));

export const generateMetadata = async ({ params }: PageProps<'/[locale]/builds/[tank]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const tank = decodeRouteParam((await params).tank);
  const t = await getTranslations({ locale, namespace: 'builds.meta' });
  const { name, key } = await requireRouteEntity(tankRouteEntity(tank));

  return createPageMetadata({
    title: t('title', { name }),
    description: t('description', { name }),
    path: ROUTES.builds.detail(key),
    locale,
    index: true,
    follow: true,
    hasOwnImage: true
  });
};

const BuildRoute = async ({ params }: Pick<PageProps<'/[locale]/builds/[tank]'>, 'params'>) => (
  <PrefetchBoundary state={buildPageState(decodeRouteParam((await params).tank))}>
    <BuildPage />
  </PrefetchBoundary>
);

const Page = ({ params }: PageProps<'/[locale]/builds/[tank]'>) => (
  <>
    <Suspense>
      <RouteGuard entity={params.then(({ tank }) => tankRouteEntity(decodeRouteParam(tank)))} />
    </Suspense>
    <Suspense fallback={<PageHeaderFallback />}>
      <BuildRoute params={params} />
    </Suspense>
    <Suspense>
      <RequestTime />
    </Suspense>
  </>
);

export default withMessages({ component: Page, messages: ['builds', 'compare.points', 'compare.vs', 'plus', 'tanks.picker'] });
