import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { HubPage } from '@/views/hub';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'hub.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.hub, locale, index: true, follow: true });
};

const Page = () => (
  <Suspense fallback={<PageHeaderFallback />}>
    <HubPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['hub'] });
