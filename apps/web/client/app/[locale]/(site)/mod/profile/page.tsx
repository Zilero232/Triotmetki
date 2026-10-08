import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { ModProfilePage } from '@/views/mod-profile';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'mod.profile.meta' });

  return createPageMetadata({
    title: t('title'),
    description: t('description'),
    path: ROUTES.modProfile,
    locale,
    index: false,
    follow: true
  });
};

const Page = () => <ModProfilePage />;

export default withMessages({ component: Page, messages: ['mod.manager', 'mod.profile'] });
