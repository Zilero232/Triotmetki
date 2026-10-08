import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { DevelopersPage } from '@/views/developers';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'developers.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.developers, locale, index: true, follow: true });
};

const Page = () => <DevelopersPage />;

export default withMessages({ component: Page, messages: ['developers'] });
