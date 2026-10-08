import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PlayersPage } from '@/views/players';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'players.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.players.list, locale, index: true, follow: true });
};

const Page = () => <PlayersPage />;

export default withMessages({ component: Page, messages: ['players'] });
