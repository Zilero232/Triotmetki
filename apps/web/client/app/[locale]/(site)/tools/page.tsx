import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { ToolsPage } from '@/views/tools';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'tools.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.tools, locale, index: true, follow: true });
};

const Page = () => (
  <Suspense fallback={<PageHeaderFallback />}>
    <ToolsPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['marks.progress', 'tankMath', 'tanks.picker', 'tools'] });
