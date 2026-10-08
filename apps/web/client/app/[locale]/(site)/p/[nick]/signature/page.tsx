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
import { PlayerSignaturePage } from '@/views/player-signature';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/p/[nick]/signature'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const { nick } = await params;
  const nickname = decodeRouteParam(nick);
  const t = await getTranslations({ locale, namespace: 'profile.signature.meta' });

  return createPageMetadata({
    title: t('title', { nickname }),
    description: t('description', { nickname }),
    path: ROUTES.players.signature(nickname),
    locale,
    index: false,
    follow: true
  });
};

const SignatureRoute = async ({ params }: Pick<PageProps<'/[locale]/p/[nick]/signature'>, 'params'>) => {
  const { nick } = await params;

  return <PlayerSignaturePage nickname={decodeRouteParam(nick)} />;
};

const Page = ({ params }: PageProps<'/[locale]/p/[nick]/signature'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <SignatureRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['players.head', 'profile.signature'] });
