import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { MarksBody, MarksBodySkeleton, MarksLiveFigures, MarksPage } from '@/views/marks';
import { marksPageState } from '@/views/marks/server';

export const generateMetadata = async () => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'marks.meta' });

  return createPageMetadata({ title: t('title'), description: t('description'), path: ROUTES.marks, locale, index: true, follow: true });
};

const Page = ({ searchParams }: PageProps<'/[locale]/marks'>) => {
  const state = searchParams.then(marksPageState);

  return (
    <MarksPage
      figures={
        <PrefetchBoundary state={state}>
          <MarksLiveFigures />
        </PrefetchBoundary>
      }
    >
      <Suspense fallback={<MarksBodySkeleton />}>
        <PrefetchBoundary state={state}>
          <MarksBody />
        </PrefetchBoundary>
      </Suspense>
    </MarksPage>
  );
};

export default withMessages({ component: Page, messages: ['marks', 'status.label', 'tanks.filters'] });
