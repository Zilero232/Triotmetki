import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeroFallback } from '@/ui-kit';
import { BuildsCatalogPage } from '@/views/builds-catalog';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'buildsCatalog.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.builds.list, locale, index: true, follow: true });
};

const Page = () => (
  <Suspense fallback={<PageHeroFallback />}>
    <BuildsCatalogPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['buildsCatalog', 'status.label', 'tanks.filters'] });
