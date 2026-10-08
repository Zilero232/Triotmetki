import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { MiniAppPage } from '@/views/mini-app';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'tg.vkMeta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.vkMiniApp, locale });
};

const Page = () => <MiniAppPage platform='vk' />;

export default withMessages({ component: Page, messages: ['tg'] });
