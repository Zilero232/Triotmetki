import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeroFallback } from '@/ui-kit';
import { LeaguesPage } from '@/views/leagues';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'social.meta.leagues' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.social.leagues, locale, index: false, follow: true });
};

const Page = () => (
  <Suspense fallback={<PageHeroFallback />}>
    <LeaguesPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['social.leagues', 'social.shell'] });
