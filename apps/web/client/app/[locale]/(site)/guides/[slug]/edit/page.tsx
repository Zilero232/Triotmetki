import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { GuideEditorPage } from '@/views/guide-editor';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/guides/[slug]/edit'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'guides.editorMeta' });

  return createPageMetadata({ title: t('editTitle'), description: t('description'), path: ROUTES.guides.edit(slug), locale });
};

const GuideEditRoute = async ({ params }: Pick<PageProps<'/[locale]/guides/[slug]/edit'>, 'params'>) => {
  const { slug } = await params;

  return <GuideEditorPage slug={decodeRouteParam(slug)} />;
};

const Page = ({ params }: PageProps<'/[locale]/guides/[slug]/edit'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <GuideEditRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['guides', 'maps', 'tanks.picker'] });
