import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';

import { withMessages } from '@/app/messages';
import { tournamentRouteMeta } from '@/entities/tournament/tournament/server';
import { ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { createPageMetadata } from '@/shared/seo';
import { PageHeaderFallback } from '@/ui-kit';
import { TournamentPage } from '@/views/tournament';

export const generateMetadata = async ({ params }: PageProps<'/[locale]/tournaments/[slug]'>): Promise<Metadata> => {
  const locale = resolveLocale(await rootParams.locale());
  const slug = decodeRouteParam((await params).slug);
  const t = await getTranslations({ locale, namespace: 'tournaments.detailMeta' });
  const { meta } = await tournamentRouteMeta(slug);

  return createPageMetadata({
    title: meta ? t('titleNamed', { title: meta.title }) : t('title'),
    description: meta ? t('descriptionNamed', { title: meta.title }) : t('description'),
    path: ROUTES.tournaments.detail(slug),
    locale,
    index: meta?.isListed ?? false,
    follow: true
  });
};

const TournamentRoute = async ({ params }: Pick<PageProps<'/[locale]/tournaments/[slug]'>, 'params'>) => {
  const { slug } = await params;

  return <TournamentPage slug={decodeRouteParam(slug)} />;
};

const Page = ({ params }: PageProps<'/[locale]/tournaments/[slug]'>) => (
  <Suspense fallback={<PageHeaderFallback />}>
    <TournamentRoute params={params} />
  </Suspense>
);

export default withMessages({ component: Page, messages: ['community.requirements', 'tournaments'] });
