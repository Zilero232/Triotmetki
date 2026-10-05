import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { replayRouteMeta } from '@/entities/replay/replay/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PageHeroFallback } from '@/ui-kit';
import { ReplayPage } from '@/views/replay';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/replays/[id]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const id = decodeRouteParam((await params).id);
  const t = await getTranslations({ locale, namespace: 'replays.detailMeta' });
  const { meta } = await replayRouteMeta(id);
  const named = meta?.player && meta.mapName ? { player: meta.player, map: meta.mapName, damage: meta.damageDealt ?? 0 } : null;

  return createPageMetadata({
    title: named ? t('titleNamed', named) : t('title'),
    description: named ? t('descriptionNamed', named) : t('description'),
    path: ROUTES.replays.detail(id),
    locale,
    index: meta?.isPublic ?? false,
    follow: true
  });
};

const ReplayRoute = async ({ params }: Pick<PageProps<'/[locale]/replays/[id]'>, 'params'>) => {
  const { id } = await params;

  return <ReplayPage id={decodeRouteParam(id)} />;
};

const Page = ({ params }: PageProps<'/[locale]/replays/[id]'>) => (
  <Suspense fallback={<PageHeroFallback />}>
    <ReplayRoute params={params} />
  </Suspense>
);

export default Page;
