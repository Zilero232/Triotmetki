import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { ForStreamersPage } from '@/views/for-streamers';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'streamers.meta' });

  return createPageMetadata({
    title: t('title'),
    description: t('description'),
    path: ROUTES.streamers.forStreamers,
    locale,
    index: true,
    follow: true
  });
};

const Page = () => <ForStreamersPage />;

export default withMessages({ component: Page, messages: ['overlay', 'streamer.overlays', 'streamers', 'streamersDirectory.hub'] });
