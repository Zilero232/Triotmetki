import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { PageHeroFallback } from '@/ui-kit';
import { VehicleCatalogPage } from '@/views/vehicle-catalog';
import { vehicleCatalogPageState } from '@/views/vehicle-catalog/server';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'vehicleCatalog.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.tanks.catalog, locale, index: true, follow: true });
};

const Page = ({ searchParams }: PageProps<'/[locale]/t'>) => (
  <Suspense fallback={<PageHeroFallback />}>
    <PrefetchBoundary state={searchParams.then(() => vehicleCatalogPageState())}>
      <VehicleCatalogPage />
    </PrefetchBoundary>
  </Suspense>
);

export default withMessages({ component: Page, messages: ['status.label', 'tanks.filters', 'vehicleCatalog'] });
