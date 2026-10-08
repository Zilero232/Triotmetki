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
import { StreamerClaimPage } from '@/views/streamer-claim';

export const instant = false;

export const generateMetadata = async ({ params }: PageProps<'/[locale]/s/[slug]/claim'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'streamersDirectory.claimMeta' });

  return createPageMetadata({ title: t('title', { slug }), description: t('description'), path: ROUTES.streamers.claim(slug), locale, index: false });
};

const ClaimRoute = async ({ params }: Pick<PageProps<'/[locale]/s/[slug]/claim'>, 'params'>) => {
  const { slug } = await params;

  return <StreamerClaimPage slug={decodeRouteParam(slug)} />;
};

const Page = ({ params }: PageProps<'/[locale]/s/[slug]/claim'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <ClaimRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['streamersDirectory'] });
