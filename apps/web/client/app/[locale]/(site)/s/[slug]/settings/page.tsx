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
import { PageHeaderFallback } from '@/ui-kit';
import { StreamerSettingsPage } from '@/views/streamer-settings';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/s/[slug]/settings'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'streamerSettings.meta.streamer' });
  const { name, key, isFound } = await streamerRouteEntity(slug);

  return createPageMetadata({
    title: t('title', { name }),
    description: t('description', { name }),
    path: ROUTES.streamers.settings.profile(key),
    locale,
    index: isFound,
    follow: isFound
  });
};

const StreamerSettingsRoute = async ({ params }: Pick<PageProps<'/[locale]/s/[slug]/settings'>, 'params'>) => {
  const { slug } = await params;

  return <StreamerSettingsPage slug={decodeRouteParam(slug)} />;
};

const Page = ({ params }: PageProps<'/[locale]/s/[slug]/settings'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <StreamerSettingsRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['mod.manager', 'streamerSettings'] });
