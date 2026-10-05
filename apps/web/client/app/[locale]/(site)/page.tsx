import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { JsonLd, siteJsonLd } from '@/shared/seo/json-ld';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { HomePage } from '@/views/home';
import { homePageState } from '@/views/home/server';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'home.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.home, locale, index: true, follow: true });
};

const Page = async () => (
  <>
    <JsonLd data={siteJsonLd(resolveLocale(await rootParams.locale()))} />
    <Suspense fallback={<HomePage />}>
      <PrefetchBoundary state={homePageState()}>
        <HomePage />
      </PrefetchBoundary>
    </Suspense>
  </>
);

export default Page;
