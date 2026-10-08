import { getLocale, getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata, defaultMetadata, defaultViewport } from '@/shared/seo';
import { NotFoundView } from '@/views/not-found';

import SiteLayout from './[locale]/(site)/layout';
import LocaleLayout from './[locale]/layout';

export const instant = false;

export const viewport = defaultViewport;

export const generateMetadata = async () => {
  const locale = resolveLocale(await getLocale());
  const t = await getTranslations({ locale, namespace: 'notFound' });

  return { ...defaultMetadata, ...createPageMetadata({ title: t('title'), description: t('body'), locale }), robots: null };
};

const GlobalNotFound = () => (
  <LocaleLayout>
    <SiteLayout>
      <NotFoundView />
    </SiteLayout>
  </LocaleLayout>
);

export default GlobalNotFound;
