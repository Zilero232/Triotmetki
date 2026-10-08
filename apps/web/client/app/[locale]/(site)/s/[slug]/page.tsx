import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { streamerRouteEntity } from '@/entities/streamer/streamer/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { StreamerPage, StreamerSkeleton } from '@/views/streamer';
import { streamerPageState } from '@/views/streamer/server';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/s/[slug]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'streamer.publicMeta' });
  const { name, key } = await requireRouteEntity(streamerRouteEntity(slug));

  return createPageMetadata({
    title: t('title', { name }),
    description: t('description', { name }),
    path: ROUTES.streamers.profile(key),
    locale,
    index: true,
    follow: true
  });
};

const StreamerRoute = async ({ params }: Pick<PageProps<'/[locale]/s/[slug]'>, 'params'>) => {
  const slug = decodeRouteParam((await params).slug);

  return (
    <PrefetchBoundary state={streamerPageState(slug)}>
      <StreamerPage slug={slug} />
    </PrefetchBoundary>
  );
};

const Page = ({ params }: PageProps<'/[locale]/s/[slug]'>) => (
  <Suspense fallback={<StreamerSkeleton isPage />}>
    <StreamerRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['plus', 'streamer.page', 'streamersDirectory', 'tanks.picker'] });
