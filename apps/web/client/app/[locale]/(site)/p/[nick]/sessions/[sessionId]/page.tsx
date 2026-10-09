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
import { requireRouteEntity } from '@/shared/seo/require-route-entity';
import { PageHeaderFallback } from '@/ui-kit';
import { PlayerSessionPage } from '@/views/player-session';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/p/[nick]/sessions/[sessionId]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { nick, sessionId } = await params;
  const t = await getTranslations({ locale, namespace: 'profile.sessions.meta' });
  const { name: nickname } = await requireRouteEntity(playerRouteEntity(decodeRouteParam(nick)));

  return createPageMetadata({
    title: t('title', { nickname }),
    description: t('description', { nickname }),
    path: ROUTES.players.session({ nickname, sessionId }),
    locale,
    hasOwnImage: true
  });
};

const SessionRoute = async ({ params }: Pick<PageProps<'/[locale]/p/[nick]/sessions/[sessionId]'>, 'params'>) => {
  const { nick, sessionId } = await params;
  const nickname = decodeRouteParam(nick);

  await requireRouteEntity(playerRouteEntity(nickname));

  return <PlayerSessionPage nickname={nickname} sessionId={sessionId} />;
};

const Page = ({ params }: PageProps<'/[locale]/p/[nick]/sessions/[sessionId]'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <SessionRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['players.head', 'profile.sessions'] });
