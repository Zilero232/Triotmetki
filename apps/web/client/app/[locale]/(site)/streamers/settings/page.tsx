import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { StreamersSettingsPage } from '@/views/streamers-settings';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'streamerSettings.meta.list' });

  return createPageMetadata({
    title: t('title'),
    description: t('description'),
    path: ROUTES.streamers.settings.table,
    locale,
    index: true,
    follow: true
  });
};

const Page = () => (
  <Suspense fallback={<PageHeaderFallback />}>
    <StreamersSettingsPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['mod.manager', 'streamerSettings', 'streamersDirectory.hub'] });
