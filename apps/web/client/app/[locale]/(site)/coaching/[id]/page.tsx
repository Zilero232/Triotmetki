import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { coachRouteMeta } from '@/entities/coaching/coach/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PageHeroFallback } from '@/ui-kit';
import { CoachPage } from '@/views/coach';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/coaching/[id]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const id = decodeRouteParam((await params).id);
  const t = await getTranslations({ locale, namespace: 'coaching.coachMeta' });
  const { meta } = await coachRouteMeta(id);

  return createPageMetadata({
    title: meta ? t('titleNamed', { name: meta.name }) : t('title'),
    description: meta ? t('descriptionNamed', { name: meta.name, headline: meta.headline }) : t('description'),
    path: ROUTES.coaching.coach(id),
    locale,
    index: meta?.isActive ?? false,
    follow: true
  });
};

const CoachRoute = async ({ params }: Pick<PageProps<'/[locale]/coaching/[id]'>, 'params'>) => {
  const { id } = await params;

  return <CoachPage userId={decodeRouteParam(id)} />;
};

const Page = ({ params }: PageProps<'/[locale]/coaching/[id]'>) => (
  <Suspense fallback={<PageHeroFallback />}>
    <CoachRoute params={params} />
  </Suspense>
);

export default Page;
