import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { TopBody, TopBodySkeleton, TopPage } from '@/views/top';
import { topPageState } from '@/views/top/server';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'top.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.top, locale, index: true, follow: true });
};

const Page = ({ searchParams }: PageProps<'/[locale]/top'>) => (
  <TopPage>
    <Suspense fallback={<TopBodySkeleton />}>
      <PrefetchBoundary state={searchParams.then(topPageState)}>
        <TopBody />
      </PrefetchBoundary>
    </Suspense>
  </TopPage>
);

export default withMessages({ component: Page, messages: ['cosmetics', 'periods', 'tanks.picker', 'top'] });
