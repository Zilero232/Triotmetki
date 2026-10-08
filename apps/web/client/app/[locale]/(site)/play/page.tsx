import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { DAILY_PUZZLE_KEYS, DAILY_PUZZLES } from '@/entities/play/daily-puzzle';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { itemListJsonLd, JsonLd } from '@/shared/seo/json-ld';
import { PageHeaderFallback } from '@/ui-kit';
import { PlayHubPage } from '@/views/play-hub';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'play.hub.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.play.hub, locale, index: true, follow: true });
};

const PlayHubSchema = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'play.hub' });

  return (
    <JsonLd
      data={itemListJsonLd({
        name: t('head.title'),
        path: ROUTES.play.hub,
        items: DAILY_PUZZLE_KEYS.map((puzzle) => ({ name: t(`games.${puzzle}.title`), path: DAILY_PUZZLES[puzzle].href })),
        locale
      })}
    />
  );
};

const Page = () => (
  <>
    <Suspense>
      <PlayHubSchema />
    </Suspense>
    <Suspense fallback={<PageHeaderFallback />}>
      <PlayHubPage />
    </Suspense>
  </>
);

export default withMessages({ component: Page, messages: ['play.hub', 'play.result'] });
