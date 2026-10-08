import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { MyBattlePage } from '@/views/my-battle';

export const instant = false;

export const generateMetadata = async ({ params }: PageProps<'/[locale]/me/battles/[id]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { id } = await params;
  const t = await getTranslations({ locale, namespace: 'analytics.battleMeta' });

  return createPageMetadata({
    title: t('title'),
    description: t('description'),
    path: ROUTES.account.battle(decodeRouteParam(id)),
    locale,
    index: false,
    follow: false
  });
};

const BattleRoute = async ({ params }: Pick<PageProps<'/[locale]/me/battles/[id]'>, 'params'>) => {
  const { id } = await params;

  return <MyBattlePage id={decodeRouteParam(id)} />;
};

const Page = ({ params }: PageProps<'/[locale]/me/battles/[id]'>) => (
  <Suspense>
    <BattleRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['analytics.battle', 'maps', 'plus'] });
