import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { MyBattlesPage } from '@/views/my-analytics';

export const instant = false;

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'analytics.battlesMeta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.account.battles, locale });
};

const Page = () => <MyBattlesPage />;

export default withMessages({ component: Page, messages: ['analytics', 'maps', 'periods', 'plus', 'tanks.picker'] });
