import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { TacticsPage } from '@/views/tactics';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'tactics.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.tactics.list, locale, index: true, follow: true });
};

const Page = () => (
  <Suspense fallback={<PageHeaderFallback />}>
    <TacticsPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['maps', 'tactics'] });
