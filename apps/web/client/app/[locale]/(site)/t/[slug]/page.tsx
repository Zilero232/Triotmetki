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
import { PageHeroFallback } from '@/ui-kit';
import { TankPage } from '@/views/tank';
import { tankPageState } from '@/views/tank/server';

export const generateStaticParams = async () => (await topTankSlugs({ fallback: ROUTE_STATIC_PARAMS.fallback.tank })).map((slug) => ({ slug }));

export const generateMetadata = async ({ params }: PageProps<'/[locale]/t/[slug]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'tank.meta' });
  const { name, key } = await requireRouteEntity(tankRouteEntity(slug));

  return createPageMetadata({
    title: t('title', { name }),
    description: t('description', { name }),
    path: ROUTES.tanks.detail(key),
    locale,
    index: true,
    follow: true,
    hasOwnImage: true
  });
};

const TankRoute = async ({ params }: Pick<PageProps<'/[locale]/t/[slug]'>, 'params'>) => (
  <PrefetchBoundary state={tankPageState(decodeRouteParam((await params).slug))}>
    <TankPage />
  </PrefetchBoundary>
);

const Page = ({ params }: PageProps<'/[locale]/t/[slug]'>) => (
  <>
    <Suspense>
      <RouteGuard entity={params.then(({ slug }) => tankRouteEntity(decodeRouteParam(slug)))} />
    </Suspense>
    <Suspense fallback={<PageHeroFallback />}>
      <TankRoute params={params} />
    </Suspense>
    <Suspense>
      <RequestTime />
    </Suspense>
  </>
);

export default withMessages({
  component: Page,
  messages: [
    'armor',
    'bestBattles.widget',
    'builds.panels',
    'maps.samples',
    'marks.progress',
    'notFound.description',
    'notFound.title',
    'periods',
    'plus',
    'showcase',
    'tankMath',
    'tanks.picker'
  ]
});
