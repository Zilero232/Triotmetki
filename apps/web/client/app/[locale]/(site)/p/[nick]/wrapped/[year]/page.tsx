import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { playerRouteEntity } from '@/entities/player/profile/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { PageHeaderFallback } from '@/ui-kit';
import { parseWrappedYear, PlayerWrappedPage } from '@/views/player-wrapped';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/p/[nick]/wrapped/[year]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { nick, year: rawYear } = await params;
  const year = parseWrappedYear(rawYear);

  if (year === null) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'wrapped.meta' });
  const { name: nickname } = await requireRouteEntity(playerRouteEntity(decodeRouteParam(nick)));

  return createPageMetadata({
    title: t('title', { nickname, year }),
    description: t('description', { nickname, year }),
    path: ROUTES.players.wrapped({ nickname, year }),
    locale,
    index: false,
    follow: true,
    hasOwnImage: true
  });
};

const WrappedRoute = async ({ params }: Pick<PageProps<'/[locale]/p/[nick]/wrapped/[year]'>, 'params'>) => {
  const { nick, year: rawYear } = await params;
  const year = parseWrappedYear(rawYear);

  if (year === null) {
    notFound();
  }

  const nickname = decodeRouteParam(nick);

  await requireRouteEntity(playerRouteEntity(nickname));

  return <PlayerWrappedPage nickname={nickname} year={year} />;
};

const Page = ({ params }: PageProps<'/[locale]/p/[nick]/wrapped/[year]'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <WrappedRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['marks', 'players.head', 'tanks.picker', 'wrapped'] });
