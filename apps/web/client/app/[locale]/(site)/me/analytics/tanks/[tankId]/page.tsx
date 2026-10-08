import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { MyAnalyticsTankPage } from '@/views/my-analytics';

export const instant = false;

export const generateMetadata = async ({ params }: PageProps<'/[locale]/me/analytics/tanks/[tankId]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { tankId } = await params;
  const t = await getTranslations({ locale, namespace: 'analytics.tankMeta' });

  return createPageMetadata({
    title: t('title'),
    description: t('description'),
    path: ROUTES.account.analyticsTank(Number(tankId)),
    locale,
    index: false,
    follow: false
  });
};

const TankRoute = async ({ params }: Pick<PageProps<'/[locale]/me/analytics/tanks/[tankId]'>, 'params'>) => {
  const tankId = Number((await params).tankId);

  if (!Number.isInteger(tankId) || tankId <= 0) {
    notFound();
  }

  return <MyAnalyticsTankPage tankId={tankId} />;
};

const Page = ({ params }: PageProps<'/[locale]/me/analytics/tanks/[tankId]'>) => (
  <Suspense>
    <TankRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['analytics', 'maps', 'periods', 'plus', 'tanks.picker'] });
