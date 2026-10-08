import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { GuideEditorPage } from '@/views/guide-editor';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'guides.editorMeta' });

  return createPageMetadata({ title: t('newTitle'), description: t('description'), path: ROUTES.guides.create, locale });
};

const Page = () => (
  <Suspense fallback={<PageHeaderFallback />}>
    <GuideEditorPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['guides', 'maps', 'tanks.picker'] });
