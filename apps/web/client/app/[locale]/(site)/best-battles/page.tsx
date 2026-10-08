import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeroFallback } from '@/ui-kit';
import { BestBattlesPage } from '@/views/best-battles';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'bestBattles.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.bestBattles, locale, index: true, follow: true });
};

const Page = () => (
  <Suspense fallback={<PageHeroFallback />}>
    <BestBattlesPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['bestBattles', 'maps', 'tanks.picker'] });
