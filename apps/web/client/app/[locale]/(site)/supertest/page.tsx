import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { PageHeroFallback } from '@/ui-kit';
import { SupertestPage, SupertestSkeleton } from '@/views/supertest';
import { supertestPageState } from '@/views/supertest/server';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'supertest.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.supertest, locale, index: true, follow: true });
};

const Page = ({ searchParams }: PageProps<'/[locale]/supertest'>) => (
  <Suspense
    fallback={
      <PageHeroFallback hasActionStrip>
        <SupertestSkeleton />
      </PageHeroFallback>
    }
  >
    <PrefetchBoundary state={searchParams.then(() => supertestPageState())}>
      <SupertestPage />
    </PrefetchBoundary>
  </Suspense>
);

export default withMessages({ component: Page, messages: ['plus', 'supertest'] });
