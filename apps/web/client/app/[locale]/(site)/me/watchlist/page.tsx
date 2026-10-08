import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { WatchlistPage } from '@/views/watchlist';

export const instant = false;

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'watchlist.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.account.watchlist, locale });
};

const Page = () => (
  <Suspense>
    <WatchlistPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['periods', 'players.picker', 'plus', 'watchlist'] });
