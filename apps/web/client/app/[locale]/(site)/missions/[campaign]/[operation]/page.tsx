import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { missionOperationRouteMeta } from '@/entities/mission/mission/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { createPageMetadata } from '@/shared/seo';
import { RequestTime } from '@/shared/seo/request-time';
import { requireRouteMeta } from '@/shared/seo/require-route-entity';
import { PageHeaderFallback } from '@/ui-kit';
import { MissionOperationPage, OperationSkeleton } from '@/views/mission-operation';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/missions/[campaign]/[operation]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { campaign, operation } = await params;
  const t = await getTranslations({ locale, namespace: 'missions.operationMeta' });
  const meta = await requireRouteMeta(missionOperationRouteMeta({ campaign, operation }));

  return createPageMetadata({
    title: t('title', { name: meta?.name ?? operation }),
    description: meta ? t('descriptionNamed', { name: meta.name }) : t('description'),
    path: meta ? ROUTES.missions.operation({ campaign: meta.campaign, operation: meta.operation }) : undefined,
    locale,
    index: meta !== null,
    follow: true
  });
};

const Page = () => (
  <>
    <Suspense
      fallback={
        <PageHeaderFallback>
          <OperationSkeleton />
        </PageHeaderFallback>
      }
    >
      <MissionOperationPage />
    </Suspense>
    <Suspense>
      <RequestTime />
    </Suspense>
  </>
);

export default withMessages({ component: Page, messages: ['hub.campaign', 'hub.title', 'missions', 'periods', 'plus', 'tanks'] });
