import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { BoardSkeleton, TacticBoardPage } from '@/views/tactic-board';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/tactics/[id]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { id } = await params;
  const t = await getTranslations({ locale, namespace: 'tactics.boardMeta' });

  return createPageMetadata({
    title: t('title'),
    description: t('description'),
    path: ROUTES.tactics.board(decodeRouteParam(id)),
    locale,
    index: false,
    follow: false
  });
};

const TacticBoardRoute = async ({ params }: Pick<PageProps<'/[locale]/tactics/[id]'>, 'params'>) => {
  const { id } = await params;

  return <TacticBoardPage id={decodeRouteParam(id)} />;
};

const Page = ({ params }: PageProps<'/[locale]/tactics/[id]'>) => (
  <Suspense
    fallback={
      <PageHeaderFallback hasDescription={false}>
        <BoardSkeleton />
      </PageHeaderFallback>
    }
  >
    <TacticBoardRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['maps', 'tactics'] });
