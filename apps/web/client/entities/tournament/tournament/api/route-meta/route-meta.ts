import type { RouteMeta, RouteStaticParamsInput } from '@/shared/seo';

import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteMeta, routeMeta, routeSlugs } from '@/shared/seo/server';

import type { TournamentRouteMeta } from './route-meta.types';

import { getTournament, listTournaments } from '../tournaments';

const lookupTournamentMeta = async (slug: string) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const { title, status } = await getTournament({ slug });

    return { title, isListed: status !== 'draft' };
  });
};

export const tournamentRouteMeta = async (slug: string): Promise<RouteMeta<TournamentRouteMeta>> => routeMeta(lookupTournamentMeta(slug));

export const tournamentSlugs = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({
    load: async () => (await listTournaments({ limit })).items.flatMap(({ slug, status }) => (status === 'draft' ? [] : [slug]))
  });
};
