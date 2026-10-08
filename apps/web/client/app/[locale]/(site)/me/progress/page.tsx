import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { ProgressPage } from '@/views/progression';

export const instant = false;

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'progression.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.account.progress, locale });
};

const Page = () => <ProgressPage />;

export default withMessages({ component: Page, messages: ['cosmetics', 'plus', 'progression', 'tanks.picker'] });
