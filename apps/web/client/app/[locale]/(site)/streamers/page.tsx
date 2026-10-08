import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { PageHeroFallback } from '@/ui-kit';
import { StreamersDirectoryPage } from '@/views/streamers-directory';
import { streamersPageState } from '@/views/streamers-directory/server';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'streamersDirectory.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.streamers.list, locale, index: true, follow: true });
};

const Page = ({ searchParams }: PageProps<'/[locale]/streamers'>) => (
  <Suspense fallback={<PageHeroFallback />}>
    <PrefetchBoundary state={searchParams.then(streamersPageState)}>
      <StreamersDirectoryPage />
    </PrefetchBoundary>
  </Suspense>
);

export default withMessages({ component: Page, messages: ['streamersDirectory', 'tanks.picker'] });
