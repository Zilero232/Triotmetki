import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { guideRouteMeta } from '@/entities/guide/guide/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PageHeroFallback } from '@/ui-kit';
import { GuidePage } from '@/views/guide';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/guides/[slug]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'guides.detailMeta' });
  const { meta } = await guideRouteMeta(slug);

  return createPageMetadata({
    title: meta ? t('titleNamed', { title: meta.title }) : t('title'),
    description: meta ? t('descriptionNamed', { title: meta.title }) : t('description'),
    path: ROUTES.guides.detail(slug),
    locale,
    index: meta?.isPublished ?? false,
    follow: true,
    contentLocale: meta?.contentLocale
  });
};

const GuideRoute = async ({ params }: Pick<PageProps<'/[locale]/guides/[slug]'>, 'params'>) => {
  const { slug } = await params;

  return <GuidePage slug={decodeRouteParam(slug)} />;
};

const Page = ({ params }: PageProps<'/[locale]/guides/[slug]'>) => (
  <Suspense fallback={<PageHeroFallback />}>
    <GuideRoute params={params} />
  </Suspense>
);

export default Page;
