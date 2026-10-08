import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { playerRouteEntity } from '@/entities/player/profile/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { personJsonLd } from '@/shared/seo/json-ld';
import { PrefetchBoundary } from '@/shared/seo/prefetch-boundary';
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { RouteGuard } from '@/shared/seo/route-guard';
import { PlayerProfileFallback, PlayerProfilePage } from '@/views/player-profile';
import { playerPageState } from '@/views/player-profile/server';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/p/[nick]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'profile.meta' });
  const { name: nickname } = await requireRouteEntity(playerRouteEntity(decodeRouteParam((await params).nick)));

  return createPageMetadata({
    title: t('title', { nickname }),
    description: t('description', { nickname }),
    path: ROUTES.players.profile(nickname),
    locale,
    index: true,
    follow: true,
    hasOwnImage: true
  });
};

const ProfileRoute = async ({ params }: Pick<PageProps<'/[locale]/p/[nick]'>, 'params'>) => {
  const nickname = decodeRouteParam((await params).nick);

  return (
    <PrefetchBoundary state={playerPageState(nickname)}>
      <PlayerProfilePage nickname={nickname} />
    </PrefetchBoundary>
  );
};

const Page = ({ params }: PageProps<'/[locale]/p/[nick]'>) => (
  <>
    <Suspense>
      <RouteGuard
        entity={params.then(({ nick }) => playerRouteEntity(decodeRouteParam(nick)))}
        schema={async ({ name }) => personJsonLd({ name, path: ROUTES.players.profile(name), locale: resolveLocale(await rootParams.locale()) })}
      />
    </Suspense>
    <Suspense fallback={<PlayerProfileFallback />}>
      <ProfileRoute params={params} />
    </Suspense>
  </>
);

export default withMessages({ component: Page, messages: ['cosmetics', 'marks.progress', 'periods', 'profile', 'watchlist.button'] });
