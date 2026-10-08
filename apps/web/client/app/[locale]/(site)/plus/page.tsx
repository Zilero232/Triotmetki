import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { PageHeroFallback } from '@/ui-kit';
import { PlusPage } from '@/views/plus';
import { plusPageState } from '@/views/plus/server';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'plus.meta' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });

  return createPageMetadata({
    title: t('title', { plus: tBrand('plus') }),
    description: t('description'),
    path: ROUTES.plus,
    locale,
    index: true,
    follow: true
  });
};

const Page = ({ searchParams }: PageProps<'/[locale]/plus'>) => (
  <Suspense fallback={<PageHeroFallback />}>
    <PrefetchBoundary state={searchParams.then(() => plusPageState())}>
      <PlusPage />
    </PrefetchBoundary>
  </Suspense>
);

export default withMessages({ component: Page, messages: ['plus'] });
