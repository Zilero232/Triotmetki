import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PageHeroFallback } from '@/ui-kit';
import { MissionsPage, MissionsSkeleton } from '@/views/missions';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'missions.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.missions.hub, locale, index: true, follow: true });
};

const Page = () => (
  <Suspense
    fallback={
      <PageHeroFallback>
        <MissionsSkeleton />
      </PageHeroFallback>
    }
  >
    <MissionsPage />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['missions.hub'] });
