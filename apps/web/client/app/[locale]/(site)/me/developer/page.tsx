import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { DeveloperCabinetPage } from '@/views/developer-cabinet';

export const instant = false;

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'developer.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.account.developer, locale });
};

const Page = () => <DeveloperCabinetPage />;

export default withMessages({ component: Page, messages: ['developer'] });
